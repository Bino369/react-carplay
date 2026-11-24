import { Registers as reg } from './Registers';
import { type Config, Mode } from '../modules/Messages';
export declare function getRegisterConfig({ nodeAddressLow, nodeAddressHigh, groupAddress }: Config, mode: Mode, status: number): Map<reg, number>;
