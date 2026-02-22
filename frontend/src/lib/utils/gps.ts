import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const gps = {
  getCurrentPosition: (): Promise<Coordinates> =>
    safeInvoke<Coordinates>(IPC_COMMANDS.UI_GPS_GET_CURRENT_POSITION),
};
