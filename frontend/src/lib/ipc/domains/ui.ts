import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';

/**
 * UI and window management operations
 */
export const uiOperations = {
  /**
   * Minimizes the application window
   * @returns Promise resolving when window is minimized
   */
  windowMinimize: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_MINIMIZE),

  /**
   * Maximizes the application window
   * @returns Promise resolving when window is maximized
   */
  windowMaximize: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_MAXIMIZE),

  /**
   * Closes the application window
   * @returns Promise resolving when window is closed
   */
  windowClose: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_WINDOW_CLOSE),

  /**
   * Navigates to a specific path
   * @param path - Navigation path
   * @param options - Additional navigation options
   * @returns Promise resolving when navigation is complete
   */
  navigate: (path: string, options?: Record<string, unknown>): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.NAVIGATION_UPDATE, {
      path,
      options: options || {}
    }),

  /**
   * Goes back in navigation history
   * @returns Promise resolving to the new path
   */
  goBack: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.NAVIGATION_GO_BACK),

  /**
   * Goes forward in navigation history
   * @returns Promise resolving to the new path
   */
  goForward: (): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.NAVIGATION_GO_FORWARD),

  /**
   * Gets the current navigation path
   * @returns Promise resolving to current path
   */
  getCurrent: (): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.NAVIGATION_GET_CURRENT),

  /**
   * Adds a path to navigation history
   * @param path - Path to add to history
   * @returns Promise resolving when path is added
   */
  addToHistory: (path: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.NAVIGATION_ADD_TO_HISTORY, { path }),

  /**
   * Registers keyboard shortcuts
   * @param shortcuts - Shortcut definitions
   * @returns Promise resolving when shortcuts are registered
   */
  registerShortcuts: (shortcuts: Record<string, unknown>): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SHORTCUTS_REGISTER, { shortcuts }),

  /**
   * Opens a URL in the system default browser
   * @param url - URL to open
   * @returns Promise resolving when URL is opened
   */
  shellOpen: (url: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_SHELL_OPEN_URL, { url }),

  /**
   * Gets current GPS position
   * @returns Promise resolving to GPS coordinates
   */
  gpsGetCurrentPosition: (): Promise<{ latitude: number; longitude: number; accuracy?: number }> =>
    safeInvoke<{ latitude: number; longitude: number; accuracy?: number }>(
      IPC_COMMANDS.UI_GPS_GET_CURRENT_POSITION
    ),

  /**
   * Initiates a customer call
   * @param phoneNumber - Phone number to call
   * @returns Promise resolving when call is initiated
   */
  initiateCustomerCall: (phoneNumber: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_INITIATE_CUSTOMER_CALL, {
      phone_number: phoneNumber
    }),
};