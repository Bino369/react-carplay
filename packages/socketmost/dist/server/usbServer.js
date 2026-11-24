"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbServer = void 0;
const ExplorerServer_1 = require("./ExplorerServer");
const Messages_1 = require("../modules/Messages");
const winston_1 = __importDefault(require("winston"));
class UsbServer {
    os8104;
    mostExplorer;
    logger;
    constructor(os8104) {
        this.os8104 = os8104;
        this.logger = winston_1.default.loggers.get('socketMostLogger');
        this.mostExplorer = new ExplorerServer_1.ExplorerServer(this.extSendControlMessage, this.extGetRemoteSource, this.extAllocate, this.extStream, this.extRetrieveAudio, this.extConnectSource, this.extDisonnectSource, this.extDeallocate);
        this.os8104.on(Messages_1.Os8104Events.SocketMostMessageRxEvent, (message) => {
            const newMessage = {
                eventType: Messages_1.Os8104Events.SocketMostMessageRxEvent,
                ...message,
            };
            this.logger.debug(`MOST message received from os8104: ${JSON.stringify(newMessage)}`);
            this.mostExplorer?.newMessageRx(newMessage);
        });
    }
    extSendControlMessage = (message) => {
        this.logger.debug(`external send message: ${JSON.stringify(message)}`);
        this.os8104.sendControlMessage(message);
    };
    extGetRemoteSource = (connectionLabel) => {
        this.logger.debug(`external getSource: 0x${connectionLabel.toString(16)}`);
        this.os8104.getRemoteSource();
    };
    extAllocate = () => {
        this.logger.debug(`external allocate`);
        this.os8104.allocate();
    };
    extDeallocate = () => {
        this.logger.debug('external deallocate');
        this.os8104.deallocate();
    };
    //TODO implement the below functions in socketmostusb
    extStream = (stream) => {
        this.logger.debug(`external stream ${JSON.stringify(stream)}`);
        // this.os8104.stream(stream)
    };
    extRetrieveAudio = (bytes) => {
        this.logger.debug(`external receive audio ${JSON.stringify(bytes)}`);
        // this.os8104.retrieveAudio(bytes)
    };
    extConnectSource = (data) => {
        this.logger.debug(`external getSource: ${JSON.stringify(data)}`);
        // this.os8104.connectSource(data)
    };
    extDisonnectSource = (data) => {
        this.logger.debug(`external disconnect source: ${JSON.stringify(data)}`);
        // this.os8104.deAllocateSource(data)
    };
}
exports.UsbServer = UsbServer;
