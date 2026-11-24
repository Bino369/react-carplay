/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from 'events';
import { Server } from 'socket.io';
import dgram from 'dgram';
import { AllocResult, DeallocResult, MasterFoundEvent, MessageOnly, MostRxMessage, NodePosition, RetrieveAudio, SocketMostSendMessage, Source, Stream } from '../modules/Messages';
export declare class ExplorerServer extends EventEmitter {
    io: Server;
    serverListener: dgram.Socket;
    sendControlMessage: (message: SocketMostSendMessage, telId?: number) => void;
    getRemoteSource: (connectionLabel: number) => void;
    allocate: () => void;
    stream: (stream: Stream) => void;
    retrieveAudio: (audio: RetrieveAudio) => void;
    connectSource: (data: Source) => void;
    disconnectSource: (data: Source) => void;
    deallocate: () => void;
    constructor(sendControlMessage: (message: SocketMostSendMessage, telId?: number) => void, getRemoteSource: (connectionLabel: number) => void, allocate: () => void, stream: (stream: Stream) => void, retrieveAudio: (audio: RetrieveAudio) => void, connectSource: (data: Source) => void, disconnectSource: (data: Source) => void, deallocate: () => void);
    newMessageRx(data: MasterFoundEvent | MostRxMessage | MessageOnly | AllocResult | NodePosition | DeallocResult): void;
}
