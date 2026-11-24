/// <reference types="node" />
import unix from 'unix-dgram';
import { OS8104A } from '../driver/OS8104A';
import { AllocResult, DeallocResult, MasterFoundEvent, MessageOnly, MostRxMessage, NodePosition, RetrieveAudio, SocketMostSendMessage, Source, Stream } from '../modules/Messages';
import { ExplorerServer } from './ExplorerServer';
import winston from 'winston';
export type DriverConfig = {
    version: string;
    nodeAddress: number;
    groupAddress: number;
    freq: number;
    mostExplorer: boolean;
};
export declare class SocketMost {
    logger: winston.Logger;
    configPath: string;
    config: DriverConfig;
    connected: boolean;
    connectInterval?: NodeJS.Timer;
    master?: MasterFoundEvent;
    udpSocket: unix.Socket;
    mostExplorer?: ExplorerServer;
    os8104: OS8104A;
    constructor();
    extSendControlMessage: (message: SocketMostSendMessage) => void;
    extGetRemoteSource: (connectionLabel: number) => void;
    extAllocate: () => void;
    extDeallocate: () => void;
    extStream: (stream: Stream) => void;
    extRetrieveAudio: (bytes: RetrieveAudio) => void;
    extConnectSource: (data: Source) => void;
    extDisonnectSource: (data: Source) => void;
    streamSend: (data: MasterFoundEvent | MostRxMessage | MessageOnly | AllocResult | NodePosition | DeallocResult) => void;
    checkConfigVersion(config: DriverConfig): DriverConfig;
}
