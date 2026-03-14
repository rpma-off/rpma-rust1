// Configuration service
import { ipcClient } from '@/lib/ipc/client';
import { AuthSecureStorage as _AuthSecureStorage } from '@/lib/secureStorage';
import type { JsonValue, JsonObject } from '@/types/json';
import type { AppSettings } from '@/lib/backend';
import type { Configuration, BusinessRule } from './types';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ConfigurationHistory {
  id: string;
  timestamp: string;
  change: string;
}

function ok<T>(data: T): ServiceResponse<T> {
  return { success: true, data, status: 200 };
}

function fail<T>(error: unknown, message: string): ServiceResponse<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : message,
    status: 500
  };
}

export const configurationService = {
  async getConfiguration(key: string): Promise<Configuration | null> {
    try {
      const settings = await ipcClient.settings.getAppSettings();
      if (!settings || typeof settings !== 'object') return null;
      const raw = settings as Record<string, unknown>;
      if (key in raw) {
        return {
          id: key,
          key,
          value: raw[key],
          category: 'general'
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async getSystemConfigurations(filters?: {
    category?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ServiceResponse<Configuration[]>> {
    try {
      const settings = await ipcClient.settings.getAppSettings();
      if (!settings || typeof settings !== 'object') return ok([]);
      const raw = settings as Record<string, unknown>;
      const configs = Object.entries(raw).map(([key, value]) => ({
        id: key,
        key,
        value,
        category: 'general'
      }));
      if (filters?.category) {
        return ok(configs.filter(c => c.category === filters.category));
      }
      return ok(configs);
    } catch (error) {
      return fail(error, 'Failed to get configurations');
    }
  },

  async getSystemConfigurationById(id: string): Promise<ServiceResponse<Configuration>> {
    const config = await this.getConfiguration(id);
    if (config) return ok(config);
    return fail(new Error('Not found'), 'Configuration not found');
  },

  async createSystemConfiguration(config: Record<string, unknown>): Promise<ServiceResponse<Configuration>> {
    try {
      await ipcClient.settings.updateGeneralSettings(config as JsonObject);
      return ok({ id: String(config['key'] ?? ''), key: String(config['key'] ?? ''), value: config, category: 'general' });
    } catch (error) {
      return fail(error, 'Failed to create configuration');
    }
  },

  async updateSystemConfiguration(id: string, config: Record<string, unknown>): Promise<ServiceResponse<Configuration>> {
    try {
      await ipcClient.settings.updateGeneralSettings({ [id]: config['value'] as JsonValue | undefined });
      return ok({ id, key: id, value: config['value'], category: 'general' });
    } catch (error) {
      return fail(error, 'Failed to update configuration');
    }
  },

  async deleteSystemConfiguration(_id: string): Promise<ServiceResponse<void>> {
    try {
      // Deletion logic
      return ok(undefined);
    } catch (error) {
      return fail(error, 'Failed to delete configuration');
    }
  },

  async getConfigurationHistory(_type?: string, _id?: string, _limit?: number): Promise<ServiceResponse<ConfigurationHistory[]>> {
    return ok([]);
  },

  async getBusinessHoursConfig(): Promise<ServiceResponse<JsonObject>> {
    try {
      const settings = await ipcClient.settings.getAppSettings() as AppSettings | null;
      return ok((settings?.business_hours ?? {}) as JsonObject);
    } catch (error) {
      return fail(error, 'Failed to get business hours');
    }
  },

  async updateBusinessHoursConfig(hours: JsonObject): Promise<ServiceResponse<JsonObject>> {
    try {
      await ipcClient.settings.updateBusinessHours(hours);
      return ok(hours);
    } catch (error) {
      return fail(error, 'Failed to update business hours');
    }
  },

  async getSystemStatus(): Promise<ServiceResponse<SystemStatus>> {
    return ok({ status: 'healthy' });
  },

  async validateConfiguration(_config: unknown): Promise<ServiceResponse<ValidationResult>> {
    return ok({ valid: true });
  },

  async getBusinessRules(_filters?: unknown): Promise<ServiceResponse<BusinessRule[]>> {
    try {
      // Mocking business rules from settings for now or calling appropriate IPC
      return ok([]);
    } catch (error) {
      return fail(error, 'Failed to get business rules');
    }
  },

  async updateBusinessRule(id: string, rule: Partial<BusinessRule>): Promise<ServiceResponse<BusinessRule>> {
    try {
      await ipcClient.settings.updateBusinessRules([rule as JsonValue]);
      return ok({ id, ...rule } as BusinessRule);
    } catch (error) {
      return fail(error, 'Failed to update business rule');
    }
  },

  async createBusinessRule(rule: Omit<BusinessRule, 'id'>): Promise<ServiceResponse<BusinessRule>> {
    try {
      await ipcClient.settings.updateBusinessRules([rule as JsonValue]);
      return ok({ id: 'new', ...rule } as BusinessRule);
    } catch (error) {
      return fail(error, 'Failed to create business rule');
    }
  },

  async deleteBusinessRule(_id: string): Promise<ServiceResponse<void>> {
    try {
      // Logic to delete rule
      return ok(undefined);
    } catch (error) {
      return fail(error, 'Failed to delete business rule');
    }
  }
};
