/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { InterByteTimeoutParser, PacketLengthParser, SerialPort } from 'serialport';
import EventEmitter from 'events';
import { AllocResult, DeallocResult, MostRxMessage, SocketMostSendMessage, TargetMostMessage, UsbSettings } from '../modules/Messages';
import winston from 'winston';
export declare class SocketMostUsb extends EventEmitter {
    portFound: boolean;
    portInterval: NodeJS.Timeout;
    port?: SerialPort;
    parser?: PacketLengthParser | InterByteTimeoutParser;
    multiPartMessage?: TargetMostMessage<number[]>;
    multiPartSequence: number;
    position: number;
    logger: winston.Logger;
    usbDebug: winston.Logger;
    locked: boolean;
    settings?: UsbSettings;
    constructor();
    findPort(): void;
    sendAllocateRequest(): void;
    sendConfigRequest(): void;
    sendDellocateRequest(): void;
    sendConnectMic(): void;
    sendCheckForLock(): void;
    sendShutDown(): void;
    sendControlMessage: (message: SocketMostSendMessage, telId?: number) => void;
    sendMultiPartMessage(): void;
    parseData: (data: Buffer) => void;
    parseMostMessage: (message: Buffer) => MostRxMessage;
    parseSettings: (data: Buffer) => void;
    parseAllocResponse: (data: Buffer) => AllocResult;
    parseDeallocResult: (data: Buffer) => DeallocResult;
    getRemoteSource: () => void;
    allocate: () => void;
    deallocate: () => void;
    stream: () => void;
    retrieveAudio: () => void;
    connectSource: () => void;
    disconnectSource: () => void;
    bootToDFU: () => void;
    getPosition: () => void;
    getSettings: () => void;
    forceSwitch: () => void;
    getAddress: () => {
        nodeAddressHigh: number | undefined;
        nodeAddressLow: number | undefined;
    };
    saveSettings: (settings: UsbSettings) => void;
}
