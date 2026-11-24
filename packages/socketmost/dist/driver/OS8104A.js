"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OS8104A = void 0;
const onoff_1 = require("onoff");
const spi_device_1 = __importDefault(require("spi-device"));
const events_1 = __importDefault(require("events"));
const RegisterConfig_1 = require("./RegisterConfig");
const winston_1 = __importDefault(require("winston"));
const Registers_1 = require("./Registers");
const Messages_1 = require("../modules/Messages");
const GpioConfig_1 = require("./GpioConfig");
const TRANSFER_SPEED = 180000;
const options = {
    chipSelectHigh: false,
    bitsPerWord: 8,
    lsbFirst: false,
};
class OS8104A extends events_1.default {
    freq;
    spi;
    interrupt;
    fault;
    status;
    getRegisterConfig;
    logger;
    mostStatus;
    reset;
    nodeAddressBuf;
    groupAddressBuf;
    awaitAlloc;
    awaitDealloc;
    allocResult;
    deallocResult;
    allocSourceResult;
    awaitGetSource;
    getSourceResult;
    allocTimeout;
    deallocTimeout;
    streamAllocTimeout;
    sourceAllocTimeout;
    sourceAllocCheck;
    delayTimer;
    connectionLabel;
    getSourceTimeout;
    allocCheck;
    deallocCheck;
    lockInterval;
    multiPartMessage;
    multiPartSequence;
    transceiverLocked;
    constructor(nodeAddress, groupAddress, freq) {
        super();
        this.logger = winston_1.default.loggers.get('driverLogger');
        this.spi = spi_device_1.default.openSync(0, 0, options);
        const gpiConfig = (0, GpioConfig_1.getPiGpioConfig)();
        this.logger.info('GPIO config: ' + JSON.stringify(gpiConfig));
        this.interrupt = new onoff_1.Gpio(gpiConfig.interrupt, 'in', 'falling');
        // TODO this had an unnoticed type error for debounce, now TS has saved the day, it may mess things up
        // now that it's actually working
        this.fault = new onoff_1.Gpio(gpiConfig.fault, 'in', 'both', {
            debounceTimeout: 3,
        });
        this.status = new onoff_1.Gpio(gpiConfig.status, 'in', 'both', {
            debounceTimeout: 1,
        });
        this.mostStatus = new onoff_1.Gpio(gpiConfig.mostStatus, 'in', 'both', {
            debounceTimeout: 1,
        });
        this.reset = new onoff_1.Gpio(gpiConfig.reset, 'out');
        this.freq = freq;
        // TODO not sure why these were buffers, need to review
        this.nodeAddressBuf = Buffer.alloc(2);
        this.nodeAddressBuf.writeUint16BE(nodeAddress);
        this.groupAddressBuf = Buffer.alloc(1);
        this.groupAddressBuf.writeUInt8(groupAddress);
        this.awaitAlloc = false;
        this.awaitDealloc = false;
        this.awaitGetSource = false;
        this.getSourceResult = null;
        this.multiPartSequence = 0;
        this.transceiverLocked = true;
        this.allocSourceResult = {
            byte0: -1,
            byte1: -1,
        };
        this.logger.info('starting up');
        this.startUp();
        this.getRegisterConfig = RegisterConfig_1.getRegisterConfig;
        this.fault.watch((err, val) => {
            if (err) {
                throw err;
            }
            console.log('fault', val);
        });
        this.status.watch((err, val) => {
            if (err) {
                this.logger.error('error setting status interrupt: ' + err);
                throw err;
            }
            console.log('status', val);
        });
        this.mostStatus.watch((err, val) => {
            if (err) {
                this.logger.error('error setting most status interrupt: ' + err);
                throw err;
            }
            if (val === 1) {
                this.logger.warn('MOST signal detected as off');
                this.switchOffOutput();
                //this.startUp()
            }
            else {
                this.logger.info('most status up');
                this.switchOnOutput();
            }
        });
    }
    switchOffOutput() {
        this.logger.info('switch off output emitter');
        this.writeReg(Registers_1.Registers.REG_bXCR, [
            this.readSingleReg(Registers_1.Registers.REG_bXCR) & ~Registers_1.Registers.bXCR_OUTPUT_ENABLE,
        ]);
    }
    switchOnOutput() {
        this.logger.info('switching on output');
        this.logger.info('most status up');
        this.writeReg(Registers_1.Registers.REG_bXCR, [
            this.readSingleReg(Registers_1.Registers.REG_bXCR) | Registers_1.Registers.bXCR_OUTPUT_ENABLE,
        ]);
    }
    startUp() {
        this.logger.info('resetting');
        this.interrupt.unwatchAll();
        this.logger.debug('writing reset');
        this.reset.writeSync(0);
        this.logger.debug('waiting reset');
        this.wait(0)
            .then(() => {
            this.logger.debug('stopping reset');
            this.reset.writeSync(1);
            this.interrupt.watch(e => {
                if (e) {
                    this.logger.error(`error setting interrupt watch`);
                }
                this.writeReg(0x82, [0x10]);
                this.logger.debug('SCK configured');
                this.logger.info('initial reset complete carrying out init');
                this.resetOs8104();
            });
        })
            .catch(reason => {
            throw reason;
        });
    }
    resetOs8104() {
        this.logger.debug('removing all interrupts');
        this.interrupt.unwatchAll();
        this.runConfig();
    }
    runConfig() {
        this.logger.info('running config');
        this.logger.info(`current network status is ${this.mostStatus.readSync() ? 'down' : 'up'} setting output suitably`);
        const lockStatusPin = this.readReg(0x80).readUInt8(0) & 32 ? 0 : 1;
        this.logger.info(`pin mode status: ${lockStatusPin}`);
        for (const entry of this.getRegisterConfig({
            nodeAddressLow: this.nodeAddressBuf[1],
            nodeAddressHigh: this.nodeAddressBuf[0],
            groupAddress: this.groupAddressBuf[0],
        }, lockStatusPin, this.mostStatus.readSync())) {
            this.logger.debug(`writing registry: ${entry[0].toString(16)} with value: ${entry[1].toString(16)}`);
            this.writeReg(entry[0], [entry[1]]);
        }
        const mode = this.readReg(0x80).readUInt8() & 32 ? 'Legacy' : 'Enhanced';
        this.logger.info(`running in ${mode} mode`);
        this.logger.info(`register bXCR ${this.readReg(0x80).toString()}`);
        this.interrupt.watch(() => {
            this.logger.silly('interrupt active');
            this.interruptHandler();
        });
        this.wait(10).then(() => {
            this.checkForLock();
        });
    }
    async wait(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    writeReg(address, value = []) {
        this.logger.silly(`writing reg: 0x${address.toString(16)}`);
        const message = [
            {
                byteLength: 2 + value.length,
                sendBuffer: Buffer.from([0x00, address, ...value]),
                receiveBuffer: Buffer.alloc(2 + value.length),
                speedHz: TRANSFER_SPEED,
            },
        ];
        this.spi.transferSync(message);
        // debugPrint(`Register write: 0x${addr.toString(16)} => 0x${value.toString(16)}`);
        return message[0].receiveBuffer[1];
    }
    readReg(address, bytes = 1) {
        this.writeReg(address);
        this.logger.silly(`reading reg: ${address.toString(16)}`);
        const message = [
            {
                byteLength: 1,
                sendBuffer: Buffer.from([0x01]),
                speedHz: TRANSFER_SPEED,
            },
            {
                byteLength: bytes,
                receiveBuffer: Buffer.alloc(bytes),
                speedHz: TRANSFER_SPEED,
            },
        ];
        this.spi.transferSync(message);
        if (message[1].receiveBuffer !== undefined) {
            return message[1].receiveBuffer;
        }
        else {
            return Buffer.alloc(1);
        }
    }
    readSingleReg(address) {
        this.writeReg(address);
        this.logger.silly('reading address: ' + address.toString(16));
        const message = [
            {
                byteLength: 1,
                sendBuffer: Buffer.from([0x01]),
                speedHz: TRANSFER_SPEED,
            },
            {
                byteLength: 1,
                receiveBuffer: Buffer.alloc(1),
                speedHz: TRANSFER_SPEED,
            },
        ];
        this.spi.transferSync(message);
        if (message[1].receiveBuffer !== undefined) {
            return message[1].receiveBuffer[0];
        }
        else {
            return -1;
        }
    }
    interruptHandler() {
        // Read interrupts
        const interrupts = this.readSingleReg(Registers_1.Registers.REG_bMSGS);
        if ((interrupts & Registers_1.Registers.bMSGS_MESS_RECEIVED) > 0) {
            this.logger.debug(`message received`);
            this.parseMostMessage(this.readReg(0xa0, 20));
            this.logger.silly(`resetting message received interrupt`);
            this.writeReg(Registers_1.Registers.REG_bMSGC, [
                this.readSingleReg(Registers_1.Registers.REG_bMSGC) |
                    Registers_1.Registers.bMSGC_RESET_MESSAGE_RX_INT |
                    Registers_1.Registers.bMSGC_RECEIVE_BUFF_EN,
            ]);
        }
        else if ((interrupts & Registers_1.Registers.bMSGS_ERR) > 0) {
            this.logger.warn(`most error active`);
            if (this.transceiverLocked) {
                this.parseFault(this.readSingleReg(Registers_1.Registers.REG_bXSR));
            }
        }
        else if ((interrupts & Registers_1.Registers.bMSGS_MESS_TRANSMITTED) > 0) {
            this.logger.debug('message transmitted interrupts');
            this.writeReg(Registers_1.Registers.REG_bMSGC, [
                this.readSingleReg(Registers_1.Registers.REG_bMSGC) |
                    Registers_1.Registers.bMSGC_RESET_MESSAGE_TX_INT,
            ]);
            if (this.awaitAlloc) {
                this.logger.debug('alloc result available');
                const res = this.readReg(Registers_1.Registers.REG_mXCMB, 20);
                this.allocResult = this.parseAllocateResponse(res);
                this.logger.info('allocResults: ' + JSON.stringify(this.allocResult));
                this.emit(Messages_1.Os8104Events.AllocResult, this.allocResult);
                this.writeReg(Registers_1.Registers.REG_bMSGC, [
                    this.readSingleReg(Registers_1.Registers.REG_bMSGC) & ~Registers_1.Registers.bMSGC_START_TX,
                ]);
                this.awaitAlloc = false;
                clearTimeout(this.allocTimeout);
            }
            else if (this.awaitGetSource) {
                const res = this.readReg(Registers_1.Registers.REG_mXCMB, 20);
                this.getSourceResult = this.parseRemoteGetSource(res);
                this.logger.info('remote source result: ' + JSON.stringify(this.getSourceResult));
                this.emit(Messages_1.Os8104Events.GetSourceResult, this.getSourceResult);
                this.writeReg(Registers_1.Registers.REG_bMSGC, [
                    this.readSingleReg(Registers_1.Registers.REG_bMSGC) & ~Registers_1.Registers.bMSGC_START_TX,
                ]);
                this.awaitGetSource = false;
                clearTimeout(this.getSourceTimeout);
            }
            else if (this.awaitDealloc) {
                const res = this.readReg(Registers_1.Registers.REG_mXCMB, 20);
                this.deallocResult = this.parseDeallocateResponse(res);
                this.logger.info('dealloc result' + JSON.stringify(this.deallocResult));
                this.emit(Messages_1.Os8104Events.DeallocResult, this.deallocResult);
                this.writeReg(Registers_1.Registers.REG_bMSGC, [
                    this.readSingleReg(Registers_1.Registers.REG_bMSGC) & ~Registers_1.Registers.bMSGC_START_TX,
                ]);
                this.awaitDealloc = false;
                clearTimeout(this.deallocTimeout);
            }
            this.logger.debug('message sent interrupt');
            this.emit(Messages_1.Os8104Events.MessageSent);
        }
        else if ((interrupts & Registers_1.Registers.bMSGS_NET_CHANGED) > 0) {
            this.logger.info('Network Changed');
            this.writeReg(Registers_1.Registers.REG_bMSGC, [
                this.readSingleReg(Registers_1.Registers.REG_bMSGC) |
                    Registers_1.Registers.bMSGC_RESET_NET_CONF_CHANGE,
            ]);
        }
        else {
            this.logger.info('unknown interrupt, checked: net changed, message transmitted, error, message status');
        }
    }
    parseMostMessage(message) {
        this.logger.silly('MOST raw message received');
        const data = {
            type: message.readUint8(0),
            sourceAddrHigh: message.readUint8(1),
            sourceAddrLow: message.readUint8(2),
            fBlockID: message.readUint8(3),
            instanceID: message.readUint8(4),
            fktID: message.slice(5, 7).readUint16BE() >> 4,
            opType: message.readUint16BE(5) & 0xf,
            telID: (message.readUint8(7) & 0xf0) >> 4,
            telLen: message.readUint8(7) & 0xf,
            data: message.readUint8(0) > 0x01
                ? message.slice(8, message.length - 1)
                : message.slice(8),
        };
        this.logger.debug('MOST message parsed: ' + JSON.stringify(data));
        // Check if message is a source allocate result message (0x101)
        if (data.fktID === 0x101 && data.opType === 12) {
            this.allocSourceResult = {
                byte0: data.data[2],
                byte1: data.data[3],
            };
            this.logger.info('Source allocated result: ' + JSON.stringify(this.allocSourceResult));
        }
        this.emit(Messages_1.Os8104Events.MostMessageRx, data);
    }
    parseFault(data) {
        console.log('Error', this.fault.readSync(), data);
        this.logger.error(`parsing fault mask: ${data.toString(16)}`);
        const masks = this.readSingleReg(Registers_1.Registers.REG_bXSR);
        this.logger.error(`Error: ${data & 0x01
            ? 'transceiver lock error'
            : data & 0x02
                ? 'SPDIF lock Error'
                : data & 0x04
                    ? 'Frequency Regulator locked'
                    : 'unknown error'}`);
        if ((data & Registers_1.Registers.bXSR_TRANS_LOCK_ACT) > 0) {
            if ((masks & Registers_1.Registers.bXSR_LOCK_ERR_MASK) === 0 &&
                this.transceiverLocked) {
                this.logger.warn('transceiver unlocked');
                this.transceiverLocked = false;
                this.emit(Messages_1.Os8104Events.Unlocked);
                this.lockInterval = setInterval(() => {
                    this.checkForLock();
                }, 100);
            }
        }
        else {
            console.log('resetting in parse');
            this.logger.debug('resetting fault');
            this.writeReg(Registers_1.Registers.REG_bMSGC, [
                this.readSingleReg(Registers_1.Registers.REG_bMSGC) | Registers_1.Registers.bMSGC_RESET_ERR_INT,
            ]);
        }
    }
    sendControlMessage({ targetAddressHigh, targetAddressLow, fBlockID, instanceID, fktID, opType, data, }, telId = 0) {
        if (data.length > 12) {
            this.multiPartMessage = {
                targetAddressHigh,
                targetAddressLow,
                fBlockID,
                instanceID,
                fktID,
                opType,
                data: [...data],
            };
            this.logger.silly(`Sending multipart control message ${JSON.stringify(this.multiPartMessage)}`);
            this.multiPartSequence = 0;
            this.logger.silly('multipart sequence: ' + this.multiPartSequence);
            this.sendMultiPartMessage();
        }
        else {
            if (this.transceiverLocked) {
                const header = Buffer.alloc(9);
                this.logger.silly(`sending targetAddressHigh: 0x${targetAddressHigh.toString(16)} targetAddressLow: 0x${targetAddressLow.toString(16)} fBlockID: ${fBlockID.toString(16)} instanceID: ${instanceID.toString(16)} fktID: ${fktID.toString(16)} opType: ${opType.toString(16)}`);
                this.logger.silly(`data: ${JSON.stringify(data)}`);
                header.writeUInt8(0x01, 0);
                header.writeUInt8(0x00, 1);
                header.writeUInt8(targetAddressHigh, 2);
                header.writeUInt8(targetAddressLow, 3);
                header.writeUInt8(fBlockID, 4);
                header.writeUInt8(instanceID, 5);
                header.writeUInt16BE((fktID << 4) | opType, 6);
                header.writeUInt8(telId | data.length, 8);
                const buf = Buffer.alloc(21);
                const tempData = Buffer.concat([header, Buffer.from(data)]);
                tempData.copy(buf, 0, 0, tempData.length);
                this.writeReg(0xc0, [...buf]);
                this.writeReg(Registers_1.Registers.REG_bMSGC, [
                    this.readSingleReg(Registers_1.Registers.REG_bMSGC) | Registers_1.Registers.bMSGC_START_TX,
                ]);
            }
            else {
                this.logger.warn(`Request to send message, but no lock discarding fBlockID targetAddressHigh: 0x${targetAddressHigh.toString(16)} targetAddressLow: 0x${targetAddressLow.toString(16)} fBlockID: ${fBlockID.toString(16)} instanceID: ${instanceID.toString(16)} fktID: ${fktID.toString(16)} opType: ${opType.toString(16)} `);
                this.logger.warn(`Data: ${JSON.stringify(data)}`);
            }
        }
    }
    sendMultiPartMessage() {
        const tempMessage = { ...this.multiPartMessage };
        this.multiPartMessage.data.length > 11
            ? (tempMessage.data = this.multiPartMessage.data.splice(0, 11))
            : (tempMessage.data = this.multiPartMessage.data);
        tempMessage.data = [this.multiPartSequence, ...tempMessage.data];
        let telId;
        // In a multipart message telId represents the beginning, middle and end of the message, telId = 1 means first message, telId = 2 means message continuing
        // telId = 3 means final message
        if (this.multiPartSequence === 0) {
            telId = 1;
        }
        else if (this.multiPartMessage.data.length < 11) {
            telId = 3;
        }
        else {
            telId = 2;
        }
        this.sendControlMessage(tempMessage, telId);
        if (telId !== 3) {
            this.once('messageSent', () => {
                this.multiPartSequence += 1;
                this.sendMultiPartMessage();
            });
        }
    }
    getNodePosition() {
        return this.readSingleReg(Registers_1.Registers.REG_bNPR);
    }
    getMaxPosition() {
        return this.readSingleReg(Registers_1.Registers.REG_bMPR);
    }
    allocate() {
        this.logger.info('running allocate');
        const header = Buffer.alloc(7);
        header.writeUInt8(0x01, 0);
        header.writeUInt8(0x03, 1);
        header.writeUInt8(0x04, 2);
        header.writeUInt8(0x00, 3);
        header.writeUInt8(0x00, 4);
        header.writeUInt8(0x04, 5);
        header.writeUInt8(0x00, 6);
        this.writeReg(0xc0, [...header]);
        this.writeReg(Registers_1.Registers.REG_bMSGC, [
            this.readSingleReg(Registers_1.Registers.REG_bMSGC) | Registers_1.Registers.bMSGC_START_TX,
        ]);
        this.logger.debug('setting allocate check');
        this.awaitAlloc = true;
        this.allocTimeout = setTimeout(() => {
            this.awaitAlloc = false;
            this.logger.error('allocate timeout');
        }, 500);
    }
    deallocate() {
        if (this.connectionLabel) {
            this.logger.info(`Running deallocate for connection label: ${this.connectionLabel.toString(16)}`);
            const header = Buffer.alloc(7);
            header.writeUInt8(0x01, 0);
            header.writeUInt8(0x04, 1);
            header.writeUInt8(0x04, 2);
            header.writeUInt8(0x00, 3);
            header.writeUInt8(0x00, 4);
            header.writeUInt8(this.connectionLabel, 5);
            header.writeUInt8(0x00, 6);
            this.writeReg(0xc0, [...header]);
            this.writeReg(Registers_1.Registers.REG_bMSGC, [
                this.readSingleReg(Registers_1.Registers.REG_bMSGC) | Registers_1.Registers.bMSGC_START_TX,
            ]);
            this.logger.debug('setting deallocate check');
            this.awaitDealloc = true;
            this.deallocTimeout = setTimeout(() => {
                this.awaitDealloc = false;
                this.logger.error('Allocate timeout');
            }, 500);
        }
        else {
            this.logger.warn('Request to deallocate, no connection label set. Allocate must be run first');
        }
    }
    getRemoteSource(connectionLabel) {
        this.logger.debug('running remote get source');
        const header = Buffer.alloc(7);
        header.writeUInt8(0x01, 0);
        header.writeUInt8(0x05, 1);
        header.writeUInt8(0x03, 2);
        header.writeUInt8(0xc8, 3);
        header.writeUInt8(0x00, 4);
        header.writeUInt8(connectionLabel, 5);
        header.writeUInt8(0x00, 6);
        this.writeReg(0xc0, [...header]);
        this.writeReg(Registers_1.Registers.REG_bMSGC, [
            this.readSingleReg(Registers_1.Registers.REG_bMSGC) | Registers_1.Registers.bMSGC_START_TX,
        ]);
        this.awaitGetSource = true;
        this.getSourceTimeout = setTimeout(() => {
            this.awaitGetSource = false;
            console.log('Remote TIMEOUT');
        }, 500);
    }
    checkForLock() {
        this.logger.debug('checking for lock');
        const lockStatus = this.readSingleReg(Registers_1.Registers.REG_bCM2);
        this.logger.debug(`lock status: 0x${lockStatus.toString(16)} `);
        const pllLocked = lockStatus & Registers_1.Registers.bCM2_UNLOCKED;
        this.logger.debug(`pllLocked: ${pllLocked}`);
        const lockSource = this.readSingleReg(Registers_1.Registers.REG_bXSR) & Registers_1.Registers.bXSR_FREQ_REG_ACT;
        this.logger.debug(`Lock Source: ${lockSource}`);
        //console.log('checking for lock', lockStatus, pllLocked, lockSource)
        if (pllLocked === 0 && lockSource === 0) {
            this.logger.warn('locked');
            this.emit(Messages_1.Os8104Events.Locked);
            this.writeReg(Registers_1.Registers.REG_bMSGC, [
                this.readSingleReg(Registers_1.Registers.REG_bMSGC) | Registers_1.Registers.bMSGC_RESET_ERR_INT,
            ]);
            this.transceiverLocked = true;
            clearInterval(this.lockInterval);
        }
    }
    parseAllocateResponse(data) {
        const answer1 = data.readUint8(7);
        const answer2 = data.readUint8(8);
        const cl = data.readUint8(9);
        const loc1 = data.readUint8(9);
        const loc2 = data.readUint8(10);
        const loc3 = data.readUint8(11);
        const loc4 = data.readUint8(12);
        this.connectionLabel = cl;
        this.logger.info(`connection label: ${this.connectionLabel.toString(16)}`);
        const result = {
            loc1,
            loc2,
            loc3,
            loc4,
            cl,
            eventType: Messages_1.Os8104Events.AllocResult,
        };
        switch (answer1) {
            case 1:
                result.answer1 = 'ALLOC_GRANT';
                result.freeChannels = answer2;
                break;
            case 2:
                result.answer1 = 'ALLOC_BUSY';
                result.freeChannels = answer2;
                break;
            case 3:
                result.answer1 = 'ALLOC_DENY';
                result.freeChannels = answer2;
                break;
            case 4:
                result.answer1 = 'WRONG_TARGET';
                result.freeChannels = answer2;
                break;
            default:
                result.answer1 = 'ERROR';
                result.freeChannels = 0;
        }
        this.logger.debug(`allocate response: ${JSON.stringify(result)}`);
        return result;
    }
    clearMra() {
        this.logger.info('clearing mra');
        this.writeReg(this.allocResult.loc1, [this.allocResult.loc1]);
        this.writeReg(this.allocResult.loc2, [this.allocResult.loc2]);
        this.writeReg(this.allocResult.loc3, [this.allocResult.loc3]);
        this.writeReg(this.allocResult.loc4, [this.allocResult.loc4]);
    }
    parseDeallocateResponse(data) {
        const answer1 = data.readUint8(7);
        const result = {
            eventType: Messages_1.Os8104Events.DeallocResult,
        };
        switch (answer1) {
            case 1:
                result.answer = 'DEALLOC_GRANT';
                this.clearMra();
                break;
            case 2:
                result.answer = 'DEALLOC_BUSY';
                break;
            case 3:
                result.answer = 'DEALLOC_WRONG';
                break;
            case 4:
                result.answer = 'WRONG_TARGET';
                break;
            default:
                result.answer = 'ERROR';
        }
        this.logger.debug(`deallocate response: ${JSON.stringify(result)}`);
        return result;
    }
    stream({ sourceAddrHigh, sourceAddrLow, fBlockID, instanceID, sinkNr, }) {
        this.allocResult = {
            loc1: -1,
            loc2: -1,
            loc3: -1,
            loc4: -1,
            cl: -1,
            eventType: Messages_1.Os8104Events.AllocResult,
        };
        this.logger.info(`stream request, sourceAddressHigh: 0x${sourceAddrHigh.toString(16)} sourceAddressLow: 0x${sourceAddrLow.toString(16)} fBlockID: 0x${fBlockID.toString(16)} instanceID: 0x${instanceID.toString(16)} sinkNr: 0x${sinkNr}`);
        this.allocate();
        this.waitForAlloc(sourceAddrHigh, sourceAddrLow, fBlockID, instanceID, sinkNr);
    }
    connectSource({ fBlockID, instanceID, sourceNr, sourceAddrLow, sourceAddrHigh, }) {
        this.logger.info(`connectSource request, sourceAddressHigh: 0x${sourceAddrHigh.toString(16)} sourceAddressLow: 0x${sourceAddrLow.toString(16)} fBlockID: 0x${fBlockID.toString(16)} instanceID: 0x${instanceID.toString(16)} sinkNr: 0x${sourceNr}`);
        this.clearSource();
        this.sendControlMessage({
            data: [sourceNr],
            fktID: 0x101,
            opType: 0x02,
            targetAddressHigh: sourceAddrHigh,
            targetAddressLow: sourceAddrLow,
            fBlockID: fBlockID,
            instanceID: instanceID,
        });
        this.waitForSourceAlloc();
    }
    clearSource() {
        this.logger.info('clearing source');
        this.allocSourceResult.byte0 = -1;
        this.allocSourceResult.byte1 = -1;
        this.resetMrtSink1();
    }
    deAllocateSource({ fBlockID, instanceID, sourceNr, sourceAddrLow, sourceAddrHigh, }) {
        this.logger.info(`deallocate source request, sourceAddressHigh: 0x${sourceAddrHigh.toString(16)} sourceAddressLow: 0x${sourceAddrLow.toString(16)} fBlockID: 0x${fBlockID.toString(16)} instanceID: 0x${instanceID.toString(16)} sinkNr: 0x${sourceNr}`);
        this.sendControlMessage({
            data: [sourceNr],
            fktID: 0x102,
            opType: 0x02,
            targetAddressHigh: sourceAddrHigh,
            targetAddressLow: sourceAddrLow,
            fBlockID: fBlockID,
            instanceID: instanceID,
        });
        this.clearSource();
    }
    retrieveAudio(bytes) {
        console.log('retrieve audio in os8104', bytes);
    }
    waitForAlloc(sourceAddrHigh, sourceAddrLow, fBlockID, instanceID, sinkNr) {
        this.logger.debug('waiting for allocate');
        this.allocCheck = setInterval(() => {
            if (this.allocResult !== null) {
                this.logger.info(`alloc done setting MRT`);
                clearTimeout(this.streamAllocTimeout);
                clearInterval(this.allocCheck);
                this.setMraSource1({
                    sourceAddrHigh,
                    sourceAddrLow,
                    fBlockID,
                    instanceID,
                    sinkNr,
                });
            }
        }, 20);
        this.streamAllocTimeout = setTimeout(() => {
            clearInterval(this.allocCheck);
            this.logger.error(`stream audio timed out on allocate check`);
        }, 1000);
    }
    waitForSourceAlloc() {
        this.logger.debug('setting source allocate timeout/check');
        this.sourceAllocCheck = setInterval(() => {
            if (this.allocSourceResult.byte0 !== -1) {
                this.logger.info('source allocate received, setting mrt....');
                clearTimeout(this.sourceAllocTimeout);
                clearInterval(this.sourceAllocCheck);
                this.setMrtSink1();
            }
        }, 20);
        this.sourceAllocTimeout = setTimeout(() => {
            clearInterval(this.sourceAllocCheck);
            this.logger.error(`source allocate timed out`);
        }, 1000);
    }
    parseRemoteGetSource(data) {
        const nodePos = data.readUint8(10);
        const group = data.readUint8(12);
        const logicalHigh = data.readUint8(13);
        const logicalLow = data.readUint8(14);
        return {
            nodePos,
            group,
            logicalHigh,
            logicalLow,
        };
    }
    // Set the MOST routing table, alloc result has to be present, it will the write the source1 data to
    // that routing table, effectively streaming on the network
    setMraSource1({ sourceAddrHigh, sourceAddrLow, fBlockID, instanceID, sinkNr, }) {
        if (this.allocResult.loc1 > -1) {
            this.logger.info('setting MRT');
            this.logger.debug(JSON.stringify(this.allocResult));
            this.writeReg(this.allocResult.loc1, [0x49]);
            this.writeReg(this.allocResult.loc2, [0x59]);
            this.writeReg(this.allocResult.loc3, [0x69]);
            this.writeReg(this.allocResult.loc4, [0x79]);
            this.sendControlMessage({
                //TODO need to align these types
                targetAddressHigh: sourceAddrHigh,
                targetAddressLow: sourceAddrLow,
                fBlockID,
                instanceID,
                fktID: 0x112,
                opType: 0x02,
                data: [sinkNr],
            });
            setTimeout(() => {
                this.logger.info('connecting sink');
                this.connectSink({
                    sourceAddrHigh,
                    sourceAddrLow,
                    fBlockID,
                    instanceID,
                    sinkNr,
                });
                this.logger.debug('pimost unmuting source');
                this.writeReg(Registers_1.Registers.REG_bSDC3, [0x00]);
                this.writeReg(Registers_1.Registers.REG_bSDC1, [
                    this.readSingleReg(Registers_1.Registers.REG_bSDC1) |
                        Registers_1.Registers.bSDC1_UNMUTE_SOURCE,
                ]);
            }, 100);
        }
    }
    setMrtSink1() {
        this.logger.debug('setting mrt');
        this.writeReg(0x46, [this.allocSourceResult.byte0]);
        this.writeReg(0x56, [this.allocSourceResult.byte1]);
        this.writeReg(0x66, [this.allocSourceResult.byte0]);
        this.writeReg(0x76, [this.allocSourceResult.byte1]);
        setTimeout(() => {
            this.writeReg(Registers_1.Registers.REG_bSDC3, [0x00]);
        }, 100);
    }
    resetMrtSink1() {
        this.logger.debug('resetting mrt');
        this.writeReg(0x46, [0xf8]);
        this.writeReg(0x56, [0xf8]);
        this.writeReg(0x66, [0xf8]);
        this.writeReg(0x76, [0xf8]);
        setTimeout(() => {
            this.writeReg(Registers_1.Registers.REG_bSDC3, [0x02]);
        }, 100);
    }
    connectSink({ sourceAddrHigh, sourceAddrLow, fBlockID, instanceID, sinkNr, }) {
        // TODO make srcDelay dynamic, unsure of impact
        this.logger.info(`connecting target sink: sourceAddress: 0x${sourceAddrHigh.toString(16)}${sourceAddrLow.toString(16)} fBlockID: ${fBlockID.toString(16)} instanceID: 0x${instanceID} sinkNr: 0x${sinkNr} location: [0x${this.allocResult?.loc1.toString(16)}, 0x${this.allocResult?.loc2.toString(16)}, 0x${this.allocResult?.loc3.toString(16)}, 0x${this.allocResult?.loc4.toString(16)}]`);
        const data = [
            sinkNr,
            this.getNodePosition(),
            this.allocResult.loc1,
            this.allocResult.loc2,
            this.allocResult.loc3,
            this.allocResult.loc4,
        ]; // data format is [sinkNumber, srcDelay, channelList]
        this.sendControlMessage({
            targetAddressHigh: sourceAddrHigh,
            targetAddressLow: sourceAddrLow,
            fBlockID,
            instanceID,
            fktID: 0x111,
            opType: 0x02,
            data,
        });
    }
    getMode() {
        const mode = this.readSingleReg(Registers_1.Registers.REG_bCM3) & Registers_1.Registers.bCM3_ENH;
        console.log('mode', mode);
    }
}
exports.OS8104A = OS8104A;
