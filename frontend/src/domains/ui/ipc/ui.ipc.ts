import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonObject, JsonValue } from '@/types/json';

export const uiIpc = {
  windowMinimize: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_MINIMIZE),

  windowMaximize: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_MAXIMIZE),

  windowClose: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_CLOSE),

  navigate: (path: string, options?: JsonObject): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.NAVIGATION_UPDATE, {
      path,
      options: options || {}
    }),

  goBack: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.NAVIGATION_GO_BACK),

  goForward: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.NAVIGATION_GO_FORWARD),

  getCurrent: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.NAVIGATION_GET_CURRENT),

  addToHistory: (path: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.NAVIGATION_ADD_TO_HISTORY, { path }),

  registerShortcuts: (shortcuts: JsonObject): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SHORTCUTS_REGISTER, { shortcuts }),

  shellOpen: (url: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_SHELL_OPEN_URL, { url }),

  gpsGetCurrentPosition: (): Promise<{ latitude: number; longitude: number; accuracy?: number }> =>
    safeInvoke<{ latitude: number; longitude: number; accuracy?: number }>(
      IPC_COMMANDS.UI_GPS_GET_CURRENT_POSITION
    ),

  initiateCustomerCall: (phoneNumber: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_INITIATE_CUSTOMER_CALL, {
      phone_number: phoneNumber
    }),
};
