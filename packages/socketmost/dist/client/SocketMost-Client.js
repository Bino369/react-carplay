"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketMostClient = void 0;
const DataGram_1 = require("./DataGram");
const events_1 = __importDefault(require("events"));
const Messages_1 = require("../modules/Messages");
class SocketMostClient extends events_1.default {
    client;
    maxPosition;
    nodePosition;
    constructor() {
        super();
        this.client = new DataGram_1.DataGram('/tmp/SocketMost-client.sock', '/tmp/SocketMost.sock');
        this.client.on('connect', () => {
            console.log('connected');
            this.getPositions().then(() => {
                console.log('resolved');
            });
            this.emit('connected');
        });
        this.maxPosition = 0;
        this.nodePosition = 0;
        this.client.on('data', data => {
            const event = JSON.parse(data.toString()).eventType;
            switch (event) {
                case Messages_1.Os8104Events.SocketMostMessageRxEvent: {
                    const message = JSON.parse(data.toString());
                    this.emit(Messages_1.Os8104Events.SocketMostMessageRxEvent, message);
                    break;
                }
                case Messages_1.Os8104Events.PositionUpdate: {
                    const message = JSON.parse(data.toString());
                    this.maxPosition = message.maxPosition;
                    this.nodePosition = message.nodePosition;
                    this.emit(Messages_1.Os8104Events.PositionUpdate, message);
                    break;
                }
                case Messages_1.Os8104Events.Locked:
                    this.emit(Messages_1.Os8104Events.Locked);
                    break;
                case Messages_1.Os8104Events.MessageSent:
                    this.emit(Messages_1.Os8104Events.MessageSent);
                    break;
                case Messages_1.Os8104Events.MasterFoundEvent: {
                    const message = JSON.parse(data.toString());
                    this.emit(Messages_1.Os8104Events.MasterFoundEvent, message);
                    break;
                }
                case Messages_1.Os8104Events.AllocResult: {
                    const message = JSON.parse(data.toString());
                    this.emit(Messages_1.Os8104Events.AllocResult, message);
                    break;
                }
                case Messages_1.Os8104Events.DeallocResult: {
                    const message = JSON.parse(data.toString());
                    this.emit(Messages_1.Os8104Events.DeallocResult, message);
                    break;
                }
                default:
                    console.log('no match', event);
            }
        });
    }
    getPositions() {
        return new Promise((resolve, reject) => {
            const data = {
                eventType: Messages_1.SocketTypes.GetNodePosition,
            };
            this.sendAppMessage(data);
            const positionTimeout = setTimeout(() => {
                reject('Get Node Position Message Time Out');
                console.log('position request timed out');
            }, 20);
            this.once('positionUpdate', () => {
                console.log('resolving');
                clearTimeout(positionTimeout);
                resolve();
            });
        });
    }
    // parseMostMessage (message) {
    //     let data = {
    //         fBlockID: message.data.readUint8(0),
    //         instanceID: message.data.readUint8(1),
    //         fktId: (message.data.slice(2,4).readUint16BE() >> 4),
    //         opType: ((message.data.readUint16BE(2) & 0xF)),
    //         telId: (message.data.readUint8(4) & 0xF0) >>4,
    //         telLen: (message.data.readUint8(4) & 0xF),
    //         data: message.type > 0x01 ? message.data.slice(5, message.data.length - 1) : message.data.slice(5),
    //         sourceAddrHigh: message.sourceAddrHigh,
    //         sourceAddrLow: message.sourceAddrLow
    //     }
    //
    //     let messageOut = {...data}
    //     messageOut.data = [...message.data]
    //     if(!this.networkMaster) {
    //         if(message.fBlockID === 2) {
    //             console.log("network master found")
    //         }
    //     }
    //     return data
    // }
    sendAppMessage(data) {
        this.client.write(JSON.stringify(data));
    }
    getMaster() {
        this.client.write(JSON.stringify({ eventType: 'getMaster' }) + '\r\n');
    }
    sendControlMessage(data) {
        return new Promise((resolve, reject) => {
            this.client.write(JSON.stringify({ eventType: 'sendControlMessage', ...data }));
            const controlMessageTimeout = setTimeout(() => {
                reject('sendMessage request timed out');
            }, 50);
            this.once('messageSent', () => {
                console.log('resolving sent Message');
                clearTimeout(controlMessageTimeout);
                resolve();
            });
        });
    }
    allocate() {
        this.client.write(JSON.stringify({ eventType: 'allocate' }));
    }
    deallocate() {
        this.client.write(JSON.stringify({ eventType: 'deallocate' }));
    }
    stream(data) {
        this.client.write(JSON.stringify({ eventType: 'stream', ...data }) + '\r\n');
    }
    retrieveAudio(data) {
        this.client.write(JSON.stringify({ eventType: 'retrieveAudio', ...data }));
    }
    connectSource(data) {
        this.client.write(JSON.stringify({ eventType: Messages_1.SocketTypes.ConnectSource, ...data }));
    }
    disconnectSource(data) {
        this.client.write(JSON.stringify({ eventType: Messages_1.SocketTypes.DisconnectSource, ...data }));
    }
}
exports.SocketMostClient = SocketMostClient;
