import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import type { OnboardingStatus, Organization, OnboardingData, UpdateOrganizationRequest, UpdateOrganizationSettingsRequest } from '@/lib/backend';
import type { JsonValue } from '@/types/json';

export const organizationIpc = {
  getOnboardingStatus: (): Promise<OnboardingStatus> =>
    safeInvoke<OnboardingStatus>('get_onboarding_status', {}),

  completeOnboarding: async (data: OnboardingData): Promise<Organization> => {
    const result = await safeInvoke<Organization>('complete_onboarding', { data: data as unknown as JsonValue });
    invalidatePattern('organization:');
    signalMutation('organization');
    return result;
  },

  get: (sessionToken: string): Promise<Organization> =>
    safeInvoke<Organization>('get_organization', { session_token: sessionToken }),

  update: async (sessionToken: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const result = await safeInvoke<Organization>('update_organization', { session_token: sessionToken, data: data as unknown as JsonValue });
    invalidatePattern('organization:');
    signalMutation('organization');
    return result;
  },

  uploadLogo: async (sessionToken: string, filePath?: string, base64Data?: string): Promise<Organization> => {
    const result = await safeInvoke<Organization>('upload_logo', {
      file_path: filePath,
      base64_data: base64Data,
      session_token: sessionToken,
    });
    invalidatePattern('organization:');
    signalMutation('organization');
    return result;
  },

  getSettings: (sessionToken: string): Promise<Record<string, string | number | boolean>> =>
    safeInvoke<Record<string, string | number | boolean>>('get_organization_settings', { session_token: sessionToken }),

  updateSettings: async (sessionToken: string, data: UpdateOrganizationSettingsRequest): Promise<Record<string, string | number | boolean>> => {
    const result = await safeInvoke<Record<string, string | number | boolean>>('update_organization_settings', { session_token: sessionToken, data: data as unknown as JsonValue });
    invalidatePattern('organization:settings');
    return result;
  },
};
