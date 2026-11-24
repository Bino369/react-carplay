type GpioConfig = {
    interrupt: number;
    fault: number;
    status: number;
    mostStatus: number;
    reset: number;
};
export declare const getPiGpioConfig: () => GpioConfig;
export {};
