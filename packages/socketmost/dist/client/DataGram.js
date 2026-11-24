"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGram = void 0;
const unix_dgram_1 = __importDefault(require("unix-dgram"));
const events_1 = __importDefault(require("events"));
const fs_1 = __importDefault(require("fs"));
class DataGram extends events_1.default {
    path;
    connectToPath;
    socket;
    listening;
    connected;
    connectInterval;
    constructor(path, connectToPath) {
        super();
        this.path = path;
        this.connectToPath = connectToPath;
        this.socket = unix_dgram_1.default.createSocket('unix_dgram', (data) => {
            this.emit('data', data);
        });
        this.listening = false;
        this.connected = false;
        try {
            fs_1.default.unlinkSync(this.path);
        }
        catch {
            console.log('No Socket to unlink/Error unlinking');
        }
        this.socket.bind(this.path);
        this.socket.on('error', (e) => {
            if (this.connected) {
                console.log('disconnected');
                this.connected = false;
                this.connectInterval = setInterval(() => {
                    console.log('connecting', this.connectToPath);
                    this.socket.connect(this.connectToPath);
                });
            }
            else {
                console.log('error', e);
            }
        });
        this.connectInterval = setInterval(() => {
            console.log('connecting', this.connectToPath);
            this.socket.connect(this.connectToPath);
        });
        this.socket.on('connect', () => {
            console.log('connected');
            if (this.connectInterval) {
                clearInterval(this.connectInterval);
            }
            this.connected = true;
            this.emit('connect');
        });
    }
    write(data) {
        // console.log("writing", data)
        this.socket.send(Buffer.from(data));
    }
}
exports.DataGram = DataGram;
