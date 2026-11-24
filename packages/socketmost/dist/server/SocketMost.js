"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketMost = void 0;
const fs_1 = __importDefault(require("fs"));
const unix_dgram_1 = __importDefault(require("unix-dgram"));
const OS8104A_1 = require("../driver/OS8104A");
const Messages_1 = require("../modules/Messages");
const ExplorerServer_1 = require("./ExplorerServer");
const winston_1 = __importDefault(require("winston"));
const DEFAULT_CONFIG = {
    version: '1.0.0',
    nodeAddress: 272,
    groupAddress: 34,
    freq: 48,
    mostExplorer: true,
};
class SocketMost {
    logger;
    configPath;
    config;
    connected;
    connectInterval;
    master;
    udpSocket;
    mostExplorer;
    os8104;
    constructor() {
        this.configPath = './config.json';
        this.config = DEFAULT_CONFIG;
        this.connected = false;
        this.logger = winston_1.default.loggers.get('socketMostLogger');
        if (fs_1.default.existsSync(this.configPath)) {
            this.config = this.checkConfigVersion(JSON.parse(fs_1.default.readFileSync(this.configPath).toString()));
            this.logger.info(`config file exists: ${JSON.stringify(this.config)}`);
        }
        else {
            this.logger.info(`config doesn't exist, creating default ${JSON.stringify(DEFAULT_CONFIG)}`);
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(DEFAULT_CONFIG));
        }
        this.udpSocket = unix_dgram_1.default.createSocket('unix_dgram', () => { });
        this.udpSocket.on('error', () => {
            // this.logger.error('UDP socket error')
            // this.logger.error(e)
            if (this.connected) {
                this.connected = false;
                this.connectInterval = setInterval(() => {
                    this.udpSocket.connect('/tmp/SocketMost-client.sock');
                }, 1000);
            }
        });
        this.udpSocket.on(Messages_1.SocketTypes.MessageReceived, async (data) => {
            this.logger.debug(`Socket Most message received: ${JSON.parse(data.toString())}`);
            const event = JSON.parse(data.toString()).eventType;
            switch (event) {
                case Messages_1.SocketTypes.SendControlMessage: {
                    //console.log("sending", message)
                    const message = JSON.parse(data.toString());
                    this.logger.debug(`request to send message: ${data.toString()}`);
                    this.os8104.sendControlMessage(message);
                    this.udpSocket.send(Buffer.from(JSON.stringify({ eventType: 'messageSent' })));
                    break;
                }
                case Messages_1.SocketTypes.GetNodePosition: {
                    this.logger.debug('get position request');
                    const returnData = {
                        nodePosition: this.os8104.getNodePosition(),
                        maxPosition: this.os8104.getMaxPosition(),
                        eventType: Messages_1.Os8104Events.PositionUpdate,
                    };
                    // REVIEW This is strange, NodePosition is not stated as a type for streamSend so unsure why no error here
                    //  my guess is that it unions the same MessageDefault as the other typed streamSends (MasterFoundEvent, newMessage)
                    //  which then makes me think there's something grossly incorrect here, leaving for now for review purposes
                    this.streamSend(returnData);
                    break;
                }
                case Messages_1.SocketTypes.GetMaster: {
                    this.logger.debug('get master request');
                    if (this.master) {
                        this.streamSend(this.master);
                    }
                    break;
                }
                case Messages_1.SocketTypes.Allocate:
                    this.logger.debug('allocate request');
                    this.os8104.allocate();
                    this.logger.debug('allocated');
                    break;
                case Messages_1.SocketTypes.GetSource: {
                    this.logger.debug('get source request');
                    const message = JSON.parse(data.toString());
                    // REVIEW don't particularly like this, had to add connection label as a chained property solely for this
                    //  call, need to look into alternatives, it feels like using an outer type (MostMessage in this case)
                    //  for a switch statement is not ideal
                    this.os8104.getRemoteSource(message.connectionLabel);
                    break;
                }
                case Messages_1.SocketTypes.Stream: {
                    const message = JSON.parse(data.toString());
                    this.logger.debug(`stream request: ${data.toString()}`);
                    this.os8104.stream(message);
                    break;
                }
                case Messages_1.SocketTypes.RetrieveAudio: {
                    // TODO remove numbers from key in message
                    const message = JSON.parse(data.toString());
                    this.logger.debug(`retrieve audio request: ${data.toString()}`);
                    this.os8104.retrieveAudio(message);
                    break;
                }
                case Messages_1.SocketTypes.NewConnection: {
                    if (this.os8104.transceiverLocked) {
                        this.streamSend({ eventType: Messages_1.Os8104Events.Locked });
                    }
                    else {
                        this.streamSend({ eventType: Messages_1.Os8104Events.Unlocked });
                    }
                    break;
                }
                case Messages_1.SocketTypes.ConnectSource: {
                    const message = JSON.parse(data.toString());
                    this.logger.debug(`connect source request: ${data.toString()}`);
                    this.os8104.connectSource(message);
                    break;
                }
                case Messages_1.SocketTypes.DisconnectSource: {
                    const message = JSON.parse(data.toString());
                    this.logger.debug(`disconnect source request: ${data.toString()}`);
                    this.os8104.deAllocateSource(message);
                    break;
                }
                case Messages_1.SocketTypes.Deallocate: {
                    this.logger.debug(`deallocate request`);
                    this.os8104.deallocate();
                }
            }
        });
        try {
            fs_1.default.unlinkSync('/tmp/SocketMost.sock');
        }
        catch (e) {
            this.logger.warn(`couldn't unlink socket, might not exist already`);
            /* swallow */
        }
        this.udpSocket.bind('/tmp/SocketMost.sock');
        this.connectInterval = setInterval(() => this.udpSocket.connect('/tmp/SocketMost-client.sock'), 100);
        this.logger.info(`creating driver nodeAddress 0x${this.config.nodeAddress.toString(16)} groupAddress: 0x${this.config.groupAddress.toString(16)} freq: ${this.config.freq}`);
        this.os8104 = new OS8104A_1.OS8104A(this.config.nodeAddress, this.config.groupAddress, this.config.freq);
        this.os8104.on(Messages_1.Os8104Events.MostMessageRx, (message) => {
            if (!this.master) {
                if (message.fBlockID === 2) {
                    this.master = {
                        eventType: Messages_1.Os8104Events.MasterFoundEvent,
                        instanceID: message.instanceID,
                        sourceAddrHigh: message.sourceAddrHigh,
                        sourceAddrLow: message.sourceAddrLow,
                    };
                    this.logger.info(`MOST master found from os8104 ${JSON.stringify(this.master)}`);
                    this.streamSend(this.master);
                }
            }
            const newMessage = {
                eventType: Messages_1.Os8104Events.SocketMostMessageRxEvent,
                ...message,
            };
            this.logger.debug(`MOST message received from os8104: ${JSON.stringify(newMessage)}`);
            this.streamSend(newMessage);
        });
        this.os8104.on(Messages_1.Os8104Events.Shutdown, () => {
            this.logger.warn('shutdown command from os8104');
            this.streamSend({ eventType: Messages_1.Os8104Events.Shutdown });
        });
        this.os8104.on(Messages_1.Os8104Events.AllocResult, (data) => {
            this.logger.info('alloc result from os8104');
            this.streamSend(data);
        });
        this.os8104.on(Messages_1.Os8104Events.MessageSent, () => {
            this.logger.debug('message sent from os8104');
            this.streamSend({ eventType: Messages_1.Os8104Events.MessageSent });
        });
        this.os8104.on(Messages_1.Os8104Events.Locked, () => {
            this.logger.debug('locked from os8104');
            this.streamSend({ eventType: Messages_1.Os8104Events.Locked });
        });
        this.os8104.on(Messages_1.Os8104Events.Unlocked, () => {
            this.logger.debug('unlocked from os8104');
            this.streamSend({ eventType: Messages_1.Os8104Events.Unlocked });
        });
        this.os8104.on(Messages_1.Os8104Events.DeallocResult, (data) => {
            this.logger.debug(`dealloc result from os8104 ${JSON.stringify(data)}`);
            this.streamSend(data);
        });
        if (this.config.mostExplorer) {
            this.logger.info('most explorer enabled, starting server....');
            this.mostExplorer = new ExplorerServer_1.ExplorerServer(this.extSendControlMessage, this.extGetRemoteSource, this.extAllocate, this.extStream, this.extRetrieveAudio, this.extConnectSource, this.extDisonnectSource, this.extDeallocate);
        }
        process.on('SIGINT', () => {
            this.logger.warn('SIGINT received closing UDP socket');
            this.udpSocket.close();
            process.exit();
        });
    }
    // When passing os8104 functions direct there were undefined for values, even when binding to `this`. I've
    // created this external functions as a work around
    // TODO needs revisiting
    extSendControlMessage = (message) => {
        this.logger.debug(`external send message: ${JSON.stringify(message)}`);
        this.os8104.sendControlMessage(message);
    };
    extGetRemoteSource = (connectionLabel) => {
        this.logger.debug(`external getSource: 0x${connectionLabel.toString(16)}`);
        this.os8104.getRemoteSource(connectionLabel);
    };
    extAllocate = () => {
        this.logger.debug(`external allocate`);
        this.os8104.allocate();
    };
    extDeallocate = () => {
        this.logger.debug('external deallocate');
        this.os8104.deallocate();
    };
    extStream = (stream) => {
        this.logger.debug(`external stream ${JSON.stringify(stream)}`);
        this.os8104.stream(stream);
    };
    extRetrieveAudio = (bytes) => {
        this.logger.debug(`external receive audio ${JSON.stringify(bytes)}`);
        this.os8104.retrieveAudio(bytes);
    };
    extConnectSource = (data) => {
        this.logger.debug(`external getSource: ${JSON.stringify(data)}`);
        this.os8104.connectSource(data);
    };
    extDisonnectSource = (data) => {
        this.logger.debug(`external disconnect source: ${JSON.stringify(data)}`);
        this.os8104.deAllocateSource(data);
    };
    streamSend = (data) => {
        this.logger.debug(`sending to client ${data}`);
        this.udpSocket.send(Buffer.from(JSON.stringify(data)));
        if (this.config.mostExplorer && data.eventType === 'newMessage') {
            this.mostExplorer?.newMessageRx(data);
        }
    };
    checkConfigVersion(config) {
        let modified = false;
        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (!Object.keys(config).includes(key)) {
                this.logger.warn(`config out of date, setting defaults`);
                // @ts-ignore
                config[key] = DEFAULT_CONFIG[key];
                modified = true;
            }
        });
        if (modified) {
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(config));
        }
        return config;
    }
}
exports.SocketMost = SocketMost;
