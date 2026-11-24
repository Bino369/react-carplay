"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mode = exports.SocketTypes = exports.Os8104Events = void 0;
var Os8104Events;
(function (Os8104Events) {
    Os8104Events["MostMessageRx"] = "newMessageRx";
    Os8104Events["AllocResult"] = "allocResult";
    Os8104Events["GetSourceResult"] = "getSourceResult";
    Os8104Events["Unlocked"] = "unlocked";
    Os8104Events["Locked"] = "locked";
    Os8104Events["MessageSent"] = "messageSent";
    Os8104Events["Shutdown"] = "shutdown";
    Os8104Events["PositionUpdate"] = "positionUpdate";
    Os8104Events["MasterFoundEvent"] = "masterFound";
    Os8104Events["SocketMostMessageRxEvent"] = "newMessage";
    Os8104Events["DeallocResult"] = "deallocResult";
})(Os8104Events || (exports.Os8104Events = Os8104Events = {}));
var SocketTypes;
(function (SocketTypes) {
    SocketTypes["MessageReceived"] = "message";
    SocketTypes["SendControlMessage"] = "sendControlMessage";
    SocketTypes["GetNodePosition"] = "getNodePosition";
    SocketTypes["GetMaster"] = "getMaster";
    SocketTypes["Allocate"] = "allocate";
    SocketTypes["GetSource"] = "getSource";
    SocketTypes["Stream"] = "stream";
    SocketTypes["RetrieveAudio"] = "retrieveAudio";
    SocketTypes["NewConnection"] = "newConnection";
    SocketTypes["ConnectSource"] = "connectSource";
    SocketTypes["DisconnectSource"] = "disconnectSource";
    SocketTypes["StopStream"] = "stopStream";
    SocketTypes["Deallocate"] = "deallocate";
})(SocketTypes || (exports.SocketTypes = SocketTypes = {}));
var Mode;
(function (Mode) {
    Mode[Mode["leg"] = 0] = "leg";
    Mode[Mode["enh"] = 1] = "enh";
})(Mode || (exports.Mode = Mode = {}));
