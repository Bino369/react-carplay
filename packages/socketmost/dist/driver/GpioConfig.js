"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPiGpioConfig = void 0;
const child_process_1 = require("child_process");
const getPiGpioConfig = () => {
    const piCheckResult = (0, child_process_1.spawnSync)('cat', [
        '/sys/firmware/devicetree/base/model',
    ]);
    const isPi5 = piCheckResult.stdout.toString().includes('Pi 5');
    return isPi5
        ? {
            interrupt: 576,
            fault: 577,
            status: 587,
            mostStatus: 597,
            reset: 588,
        }
        : { interrupt: 5, fault: 6, status: 16, mostStatus: 26, reset: 17 };
};
exports.getPiGpioConfig = getPiGpioConfig;
