import { SocketMostUsb } from '../client/SocketMost-usb';
import { ExplorerServer } from './ExplorerServer';
import { RetrieveAudio, SocketMostSendMessage, Source, Stream } from '../modules/Messages';
import winston from 'winston';
export declare class UsbServer {
    os8104: SocketMostUsb;
    mostExplorer: ExplorerServer;
    logger: winston.Logger;
    constructor(os8104: SocketMostUsb);
    extSendControlMessage: (message: SocketMostSendMessage) => void;
    extGetRemoteSource: (connectionLabel: number) => void;
    extAllocate: () => void;
    extDeallocate: () => void;
    extStream: (stream: Stream) => void;
    extRetrieveAudio: (bytes: RetrieveAudio) => void;
    extConnectSource: (data: Source) => void;
    extDisonnectSource: (data: Source) => void;
}
