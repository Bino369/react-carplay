"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplorerServer = void 0;
const events_1 = __importDefault(require("events"));
const socket_io_1 = require("socket.io");
const dgram_1 = __importDefault(require("dgram"));
const REQ_REGISTRY = {
    eventType: 'sendControlMessage',
    targetAddressHigh: 0x04,
    targetAddressLow: 0x00,
    fBlockID: 0x02,
    instanceID: 0x00,
    fktID: 0xa01,
    opType: 0x01,
    data: [],
};
class ExplorerServer extends events_1.default {
    io;
    serverListener;
    sendControlMessage;
    getRemoteSource;
    allocate;
    stream;
    retrieveAudio;
    connectSource;
    disconnectSource;
    deallocate;
    constructor(sendControlMessage, getRemoteSource, allocate, stream, retrieveAudio, connectSource, disconnectSource, deallocate) {
        super();
        this.sendControlMessage = sendControlMessage;
        this.getRemoteSource = getRemoteSource;
        this.allocate = allocate;
        this.stream = stream;
        this.retrieveAudio = retrieveAudio;
        this.connectSource = connectSource;
        this.disconnectSource = disconnectSource;
        this.deallocate = deallocate;
        this.io = new socket_io_1.Server();
        this.serverListener = dgram_1.default.createSocket('udp4');
        this.io.on('connection', socket => {
            socket.on;
        });
        this.io.listen(5556);
        this.serverListener.on('listening', () => {
            const address = this.serverListener.address();
            console.log('Listening for Most-Explorer requests on ' +
                address.address +
                ':' +
                address.port);
        });
        this.serverListener.on('message', (message, remote) => {
            console.log('SERVER RECEIVED:', remote.address + ':' + remote.port + ' - ' + message);
            const response = 'Hello there!';
            this.serverListener.send(response, 0, response.length, remote.port, remote.address);
        });
        this.io.on('connection', socket => {
            socket.on('requestRegistry', () => {
                this.sendControlMessage(REQ_REGISTRY);
            });
            socket.on('sendControlMessage', (message) => {
                this.sendControlMessage(message);
            });
            socket.on('getSource', data => {
                this.getRemoteSource(data.connectionLabel);
            });
            socket.on('allocate', () => {
                this.allocate();
            });
            socket.on('stream', (data) => {
                this.stream(data);
            });
            socket.on('retrieveAudio', (data) => {
                this.retrieveAudio(data);
            });
            socket.on('connectSource', (data) => {
                this.connectSource(data);
            });
            socket.on('disconnectSource', (data) => {
                this.disconnectSource(data);
            });
            socket.on('deallocate', () => {
                this.deallocate();
            });
        });
        this.serverListener.bind(5555);
    }
    newMessageRx(data) {
        this.io.emit('message', data);
    }
}
exports.ExplorerServer = ExplorerServer;
