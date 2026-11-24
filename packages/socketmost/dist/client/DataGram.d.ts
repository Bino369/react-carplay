/// <reference types="node" />
/// <reference types="node" />
import unix from 'unix-dgram';
import EventEmitter from 'events';
export declare class DataGram extends EventEmitter {
    path: string;
    connectToPath: string;
    socket: unix.Socket;
    listening: boolean;
    connected: boolean;
    connectInterval?: NodeJS.Timeout;
    constructor(path: string, connectToPath: string);
    write(data: string): void;
}
