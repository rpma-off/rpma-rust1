import { safeInvoke } from "@/lib/ipc/core";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import type { SendNotificationRequest } from "@/lib/backend";
import type { JsonObject, JsonValue } from "@/types/json";

interface NotificationConfig {
  provider?: string;
  api_key?: string;
  sender_email?: string;
  sender_phone?: string;
  enabled_channels?: string[];
  [key: string]: JsonValue | undefined;
}

const compactJsonObject = (
  value: Record<string, JsonValue | undefined>,
): JsonObject => {
  const entries = Object.entries(value).filter(
    ([, fieldValue]) => fieldValue !== undefined,
  ) as Array<[string, JsonValue]>;
  return Object.fromEntries(entries);
};

export const notificationsIpc = {
  initialize: (config: NotificationConfig) =>
    safeInvoke<void>(IPC_COMMANDS.INITIALIZE_NOTIFICATION_SERVICE, {
      config: compactJsonObject(config),
    }),

  send: (request: SendNotificationRequest) =>
    safeInvoke<void>(IPC_COMMANDS.SEND_NOTIFICATION, { request }),

  getStatus: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_NOTIFICATION_STATUS, {}),

  // Recent activities for admin dashboard
  getRecentActivities: () =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_RECENT_ACTIVITIES, {}),
};
