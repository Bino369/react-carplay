"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
winston_1.default.addColors({
    driver: 'bold cyan',
    socket: 'bold magenta',
    app: 'bold spring green',
});
const colorizer = winston_1.default.format.colorize();
winston_1.default.loggers.add('driverLogger', {
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.cli(), winston_1.default.format.metadata(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.timestamp({ format: 'hh:mm:ss.SSS' }), winston_1.default.format.printf(info => {
        const out = `${info.timestamp} - ${colorizer.colorize('driver', info.metadata.service)}-${info.level}:${info.message} `;
        return out;
    })),
    defaultMeta: {
        service: 'OS8104 Driver',
    },
    transports: [new winston_1.default.transports.Console()],
    exitOnError: false,
});
winston_1.default.loggers.add('socketMostLogger', {
    level: process.env.SOCKETMOST_LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.cli(), winston_1.default.format.metadata(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.timestamp({ format: 'hh:mm:ss.SSS' }), winston_1.default.format.printf(info => {
        const out = `${info.timestamp} - ${colorizer.colorize('socket', info.metadata.service)}-${info.level}:${info.message} `;
        return out;
    })),
    defaultMeta: {
        service: 'SocketMost',
    },
    transports: [new winston_1.default.transports.Console()],
});
