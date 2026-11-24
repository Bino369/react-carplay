"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidParamFinder = void 0;
const SocketMost_1 = require("../server/SocketMost");
const SocketMost_Client_1 = require("../client/SocketMost-Client");
const winston_1 = __importDefault(require("winston"));
const Messages_1 = require("../modules/Messages");
class ValidParamFinder {
    socketMost;
    targetAddressHigh;
    targetAddressLow;
    fBlockID;
    instanceID;
    fktID;
    data;
    paramOffset;
    opType;
    noResponseTimeout;
    paramCycle;
    running;
    socketMostClient;
    logger;
    constructor(targetAddressHigh, targetAddressLow, fBlockID, instanceID, fktID, data, paramOffset, opType) {
        this.opType = opType;
        this.targetAddressHigh = targetAddressHigh;
        this.targetAddressLow = targetAddressLow;
        this.fBlockID = fBlockID;
        this.instanceID = instanceID;
        this.fktID = fktID;
        this.data = data;
        this.running = false;
        this.paramOffset = paramOffset;
        this.paramCycle = 0;
        this.logger = winston_1.default.loggers.get('utils');
        this.socketMost = new SocketMost_1.SocketMost();
        this.logger.info('creating Valid Param Finder');
        this.logger.info(`address = 0x${this.targetAddressHigh.toString(16) + this.targetAddressLow.toString(16)} fBlockID = ${this.fBlockID.toString(16)} instanceID = ${this.instanceID} fktID = ${this.fktID}`);
        this.logger.info(`We will be cycling byte ${this.paramOffset}`);
        this.logger.info('awaiting lock......');
        this.socketMostClient = new SocketMost_Client_1.SocketMostClient();
        this.socketMostClient.on(Messages_1.Os8104Events.SocketMostMessageRxEvent, (data) => {
            if (data.fBlockID === this.fBlockID &&
                data.fktID === this.fktID &&
                this.running) {
                clearTimeout(this.noResponseTimeout);
                if (data.opType === 0x09 || data.opType === 0x15) {
                    this.logger.error(`error response received for param Value: ${this.paramCycle}`);
                    this.logger.error(`${JSON.stringify(data)}`);
                }
                else {
                    this.logger.info(`success message received for param Value: ${this.paramCycle}`);
                    this.logger.info(`${JSON.stringify(data)}`);
                }
                this.startNextCycle();
            }
        });
        this.socketMostClient.once(Messages_1.Os8104Events.Locked, () => {
            this.logger.info('MOST network Locked');
            this.logger.info('Waiting 2 seconds before message send');
            setTimeout(() => {
                this.running = true;
                this.sendMessage();
            }, 2000);
        });
    }
    startNextCycle() {
        if (this.paramCycle + 1 < 0x100) {
            this.logger.info(`Setting next param value to: ${this.paramCycle + 1}`);
            this.paramCycle += 1;
            this.sendMessage();
        }
        else {
            this.logger.info(`finished!`);
            this.running = false;
        }
    }
    async sendMessage() {
        const newData = this.data;
        newData[this.paramOffset] = this.paramCycle;
        await this.socketMostClient.sendControlMessage({
            fBlockID: this.fBlockID,
            instanceID: this.instanceID,
            fktID: this.fktID,
            opType: this.opType,
            data: newData,
            targetAddressHigh: this.targetAddressHigh,
            targetAddressLow: this.targetAddressLow,
        });
        this.noResponseTimeout = setTimeout(this.noResponse, 1000);
    }
    noResponse() {
        this.logger.info(`no response received for param Value ${this.paramCycle}`);
        this.startNextCycle();
    }
}
exports.ValidParamFinder = ValidParamFinder;
