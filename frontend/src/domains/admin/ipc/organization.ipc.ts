import { safeInvoke, invalidatePattern } from "@/lib/ipc/core";
import { signalMutation } from "@/lib/data-freshness";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import type {
  OnboardingStatus,
  Organization,
  OnboardingData,
  UpdateOrganizationRequest,
  UpdateOrganizationSettingsRequest,
} from "@/lib/backend";
import type { JsonObject, JsonValue } from "@/types/json";

const compactJsonObject = (
  value: Record<string, JsonValue | undefined>,
): JsonObject => {
  const entries = Object.entries(value).filter(
    ([, fieldValue]) => fieldValue !== undefined,
  ) as Array<[string, JsonValue]>;
  return Object.fromEntries(entries);
};

export const organizationIpc = {
  getOnboardingStatus: (): Promise<OnboardingStatus> =>
    safeInvoke<OnboardingStatus>(IPC_COMMANDS.GET_ONBOARDING_STATUS, {}),

  completeOnboarding: async (data: OnboardingData): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.COMPLETE_ONBOARDING,
      { data: data as unknown as JsonValue },
    );
    invalidatePattern("organization:");
    signalMutation("organization");
    return result;
  },

  get: (sessionToken: string): Promise<Organization> =>
    safeInvoke<Organization>(IPC_COMMANDS.GET_ORGANIZATION, {
      session_token: sessionToken,
    }),

  update: async (
    sessionToken: string,
    data: UpdateOrganizationRequest,
  ): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.UPDATE_ORGANIZATION,
      { session_token: sessionToken, data: data as unknown as JsonValue },
    );
    invalidatePattern("organization:");
    signalMutation("organization");
    return result;
  },

  uploadLogo: async (
    sessionToken: string,
    filePath?: string,
    base64Data?: string,
  ): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.UPLOAD_LOGO,
      compactJsonObject({
        file_path: filePath,
        base64_data: base64Data,
        session_token: sessionToken,
      }),
    );
    invalidatePattern("organization:");
    signalMutation("organization");
    return result;
  },

  getSettings: (
    sessionToken: string,
  ): Promise<Record<string, string | number | boolean>> =>
    safeInvoke<Record<string, string | number | boolean>>(
      IPC_COMMANDS.GET_ORGANIZATION_SETTINGS,
      { session_token: sessionToken },
    ),

  updateSettings: async (
    sessionToken: string,
    data: UpdateOrganizationSettingsRequest,
  ): Promise<Record<string, string | number | boolean>> => {
    const result = await safeInvoke<Record<string, string | number | boolean>>(
      IPC_COMMANDS.UPDATE_ORGANIZATION_SETTINGS,
      {
        session_token: sessionToken,
        data: data as unknown as JsonValue,
      },
    );
    invalidatePattern("organization:");
    signalMutation("organization");
    return result;
  },
};
