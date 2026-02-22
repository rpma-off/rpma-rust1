import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonObject, JsonValue } from '@/types/json';

export const windowManager = {
  minimize: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_MINIMIZE),

  maximize: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_MAXIMIZE),

  close: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_CLOSE),
};

export const desktopNavigation = {
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
};

export const shellOps = {
  open: (url: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_SHELL_OPEN_URL, { url }),
};

export const shortcuts = {
  register: (shortcuts: JsonObject): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SHORTCUTS_REGISTER, { shortcuts }),
};
