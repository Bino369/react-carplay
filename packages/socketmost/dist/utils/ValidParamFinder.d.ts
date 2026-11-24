/// <reference types="node" />
import { SocketMost } from '../server/SocketMost';
import { SocketMostClient } from '../client/SocketMost-Client';
import winston from 'winston';
export declare class ValidParamFinder {
    socketMost: SocketMost;
    private targetAddressHigh;
    private targetAddressLow;
    private fBlockID;
    private instanceID;
    private fktID;
    private data;
    private paramOffset;
    private opType;
    noResponseTimeout?: NodeJS.Timeout;
    paramCycle: number;
    running: boolean;
    socketMostClient: SocketMostClient;
    logger: winston.Logger;
    constructor(targetAddressHigh: number, targetAddressLow: number, fBlockID: number, instanceID: number, fktID: number, data: number[], paramOffset: number, opType: number);
    startNextCycle(): void;
    sendMessage(): Promise<void>;
    noResponse(): void;
}
