/// <reference types="node" />
import { DataGram } from './DataGram';
import EventEmitter from 'events';
import { MessageOnly, RetrieveAudio, SocketMostSendMessage, Stream, GetSource, Source } from '../modules/Messages';
export declare class SocketMostClient extends EventEmitter {
    client: DataGram;
    maxPosition: number;
    nodePosition: number;
    constructor();
    getPositions(): Promise<void>;
    sendAppMessage(data: SocketMostSendMessage | MessageOnly | ({
        eventType: 'getSource';
    } & GetSource)): void;
    getMaster(): void;
    sendControlMessage(data: SocketMostSendMessage): Promise<void>;
    allocate(): void;
    deallocate(): void;
    stream(data: Stream): void;
    retrieveAudio(data: RetrieveAudio): void;
    connectSource(data: Source): void;
    disconnectSource(data: Source): void;
}
