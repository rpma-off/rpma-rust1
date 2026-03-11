import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export interface OnboardingStatus {
  completed: boolean;
  current_step: number;
  has_organization: boolean;
  has_admin_user: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  legal_name?: string;
  tax_id?: string;
  siret?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  logo_url?: string;
  logo_data?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  business_settings?: string;
  invoice_settings?: string;
  industry?: string;
  company_size?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  legal_name?: string;
  tax_id?: string;
  siret?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  industry?: string;
  company_size?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  legal_name?: string;
  tax_id?: string;
  siret?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  logo_url?: string;
  logo_data?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  business_settings?: string;
  invoice_settings?: string;
  industry?: string;
  company_size?: string;
}

export interface OnboardingData {
  organization: CreateOrganizationRequest;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
}

export interface OrganizationSettings {
  onboarding_completed: boolean;
  default_task_priority: string;
  default_session_timeout: number;
  require_2fa: boolean;
  date_format: string;
  currency: string;
  [key: string]: string | number | boolean;
}

export interface UpdateOrganizationSettingsRequest {
  settings: Record<string, string | number | boolean>;
}

export const organizationIpc = {
  getOnboardingStatus: async (): Promise<OnboardingStatus> => {
    const result = await safeInvoke<OnboardingStatus>(
      IPC_COMMANDS.GET_ONBOARDING_STATUS,
      {}
    );
    return result;
  },

  completeOnboarding: async (data: OnboardingData): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.COMPLETE_ONBOARDING,
      { data: data as unknown as JsonValue }
    );
    invalidatePattern('organization:');
    signalMutation('organization');
    return result;
  },

  get: async (sessionToken: string): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.GET_ORGANIZATION,
      { session_token: sessionToken }
    );
    return result;
  },

  update: async (
    sessionToken: string,
    data: UpdateOrganizationRequest
  ): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.UPDATE_ORGANIZATION,
      { session_token: sessionToken, data: data as unknown as JsonValue }
    );
    invalidatePattern('organization:');
    signalMutation('organization');
    return result;
  },

  uploadLogo: async (
    sessionToken: string,
    filePath?: string,
    base64Data?: string
  ): Promise<Organization> => {
    const result = await safeInvoke<Organization>(
      IPC_COMMANDS.UPLOAD_LOGO,
      {
        file_path: filePath,
        base64_data: base64Data,
        session_token: sessionToken,
      }
    );
    invalidatePattern('organization:');
    signalMutation('organization');
    return result;
  },

  getSettings: async (sessionToken: string): Promise<OrganizationSettings> => {
    const result = await safeInvoke<OrganizationSettings>(
      IPC_COMMANDS.GET_ORGANIZATION_SETTINGS,
      { session_token: sessionToken }
    );
    return result;
  },

  updateSettings: async (
    sessionToken: string,
    data: UpdateOrganizationSettingsRequest
  ): Promise<OrganizationSettings> => {
    const result = await safeInvoke<OrganizationSettings>(
      IPC_COMMANDS.UPDATE_ORGANIZATION_SETTINGS,
      { session_token: sessionToken, data: data as unknown as JsonValue }
    );
    invalidatePattern('organization:settings');
    return result;
  },
};
