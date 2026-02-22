// Configuration service
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { ServiceResponse } from '@/types/unified.types';
import type { JsonValue } from '@/types/json';

export interface Configuration {
  id: string;
  key: string;
  value: unknown;
  category: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  category: string;
  condition: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

const BUSINESS_RULE_PREFIX = 'business_rule_';

export class ConfigurationService {
  private static async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  static async getConfiguration(key: string): Promise<Configuration | null> {
    try {
      const token = await this.getSessionToken();
      const settings = await ipcClient.settings.getAppSettings(token);

      if (!settings || typeof settings !== 'object') return null;
      const raw = settings as Record<string, unknown>;

      if (key in raw) {
        return {
          id: key,
          key,
          value: raw[key],
          category: 'general',
        };
      }

      return null;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get configuration');
    }
  }

  static async setConfiguration(key: string, value: unknown, category: string = 'general'): Promise<Configuration> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences({ [key]: value as JsonValue }, token);

      return {
        id: key,
        key,
        value,
        category,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to set configuration');
    }
  }

  static async getConfigurationsByCategory(category: string): Promise<Configuration[]> {
    try {
      const token = await this.getSessionToken();
      const settings = await ipcClient.settings.getAppSettings(token);

      if (!settings || typeof settings !== 'object') return [];
      const raw = settings as Record<string, unknown>;

      return Object.entries(raw)
        .filter(([, v]) => {
          if (typeof v === 'object' && v !== null && 'category' in v) {
            return (v as Record<string, unknown>).category === category;
          }
          return category === 'general';
        })
        .map(([k, v]) => ({
          id: k,
          key: k,
          value: v,
          category,
        }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get configurations');
    }
  }

  static async updateBusinessRule(id: string, updates: Partial<BusinessRule>): Promise<ServiceResponse<BusinessRule>> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences(
        { [`${BUSINESS_RULE_PREFIX}${id}`]: { ...updates, updated_at: new Date().toISOString() } },
        token
      );

      const updatedRule: BusinessRule = {
        id,
        name: '',
        category: '',
        condition: '',
        action: '',
        priority: 'medium',
        is_active: true,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates
      };
      return {
        success: true,
        data: updatedRule,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business rule',
        status: 500
      };
    }
  }

  static async deleteBusinessRule(id: string): Promise<ServiceResponse<void>> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences(
        { [`${BUSINESS_RULE_PREFIX}${id}`]: null },
        token
      );

      return {
        success: true,
        data: undefined,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete business rule',
        status: 500
      };
    }
  }

  static async updateConfiguration(id: string, updates: Partial<Configuration>): Promise<ServiceResponse<Configuration>> {
    try {
      const key = updates.key || id;
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences({ [key]: updates.value as JsonValue }, token);

      const updatedConfig: Configuration = {
        id,
        key,
        value: updates.value ?? '',
        category: updates.category || 'general',
      };
      return {
        success: true,
        data: updatedConfig,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
        status: 500
      };
    }
  }

  static async deleteConfiguration(id: string): Promise<ServiceResponse<void>> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences({ [id]: null }, token);

      return {
        success: true,
        data: undefined,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete configuration',
        status: 500
      };
    }
  }

  static async getBusinessRules(_filters?: unknown): Promise<ServiceResponse<BusinessRule[]>> {
    try {
      const token = await this.getSessionToken();
      const settings = await ipcClient.settings.getAppSettings(token);

      if (!settings || typeof settings !== 'object') {
        return { success: true, data: [], status: 200 };
      }

      const raw = settings as Record<string, unknown>;
      const rules: BusinessRule[] = Object.entries(raw)
        .filter(([key]) => key.startsWith(BUSINESS_RULE_PREFIX))
        .map(([key, value]) => {
          const rule = value as Record<string, unknown>;
          return {
            id: key.replace(BUSINESS_RULE_PREFIX, ''),
            name: String(rule.name || ''),
            description: rule.description ? String(rule.description) : undefined,
            category: String(rule.category || ''),
            condition: String(rule.condition || ''),
            action: String(rule.action || ''),
            priority: (rule.priority as BusinessRule['priority']) || 'medium',
            is_active: rule.is_active !== false,
            sort_order: typeof rule.sort_order === 'number' ? rule.sort_order : 0,
            created_at: String(rule.created_at || new Date().toISOString()),
            updated_at: String(rule.updated_at || new Date().toISOString()),
            created_by: rule.created_by ? String(rule.created_by) : undefined,
            updated_by: rule.updated_by ? String(rule.updated_by) : undefined,
          };
        });

      return {
        success: true,
        data: rules,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get business rules',
        status: 500
      };
    }
  }

  static async createBusinessRule(rule: Omit<BusinessRule, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<BusinessRule>> {
    try {
      const id = crypto.randomUUID();
      const newRule: BusinessRule = {
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...rule
      };

      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences(
        { [`${BUSINESS_RULE_PREFIX}${id}`]: newRule as unknown as JsonValue },
        token
      );

      return {
        success: true,
        data: newRule,
        status: 201
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create business rule',
        status: 500
      };
    }
  }

  static async getSystemConfigurations(_filters?: unknown): Promise<ServiceResponse<Configuration[]>> {
    try {
      const token = await this.getSessionToken();
      const settings = await ipcClient.settings.getAppSettings(token);

      if (!settings || typeof settings !== 'object') {
        return { success: true, data: [], status: 200 };
      }

      const raw = settings as Record<string, unknown>;
      const configs: Configuration[] = Object.entries(raw)
        .filter(([key]) => !key.startsWith(BUSINESS_RULE_PREFIX))
        .map(([key, value]) => ({
          id: key,
          key,
          value,
          category: 'system',
        }));

      return {
        success: true,
        data: configs,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system configurations',
        status: 500
      };
    }
  }

  static async createSystemConfiguration(config: Omit<Configuration, 'id'>): Promise<ServiceResponse<Configuration>> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences({ [config.key]: config.value as JsonValue }, token);

      const newConfig: Configuration = {
        id: config.key,
        ...config
      };
      return {
        success: true,
        data: newConfig,
        status: 201
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create system configuration',
        status: 500
      };
    }
  }

  static async getSystemConfigurationById(id: string): Promise<ServiceResponse<Configuration | null>> {
    try {
      const config = await this.getConfiguration(id);
      return {
        success: true,
        data: config,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system configuration',
        status: 500
      };
    }
  }

  static async updateSystemConfiguration(id: string, updates: Partial<Configuration>): Promise<ServiceResponse<Configuration>> {
    return this.updateConfiguration(id, updates);
  }

  static async deleteSystemConfiguration(id: string): Promise<ServiceResponse<void>> {
    return this.deleteConfiguration(id);
  }

  static async getBusinessHoursConfig(): Promise<ServiceResponse<Configuration | null>> {
    try {
      const config = await this.getConfiguration('business_hours');
      return {
        success: true,
        data: config,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get business hours configuration',
        status: 500
      };
    }
  }

  static async updateBusinessHoursConfig(config: Partial<Configuration>): Promise<ServiceResponse<Configuration>> {
    try {
      const token = await this.getSessionToken();
      await ipcClient.settings.updateUserPreferences(
        { business_hours: config.value as JsonValue },
        token
      );

      const updatedConfig: Configuration = {
        id: 'business-hours',
        key: 'business_hours',
        value: config.value,
        category: 'business',
      };
      return {
        success: true,
        data: updatedConfig,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update business hours configuration',
        status: 500
      };
    }
  }

  static async getConfigurationHistory(_configurationType?: string, _configurationId?: string, _limit?: number): Promise<ServiceResponse<Configuration[]>> {
    try {
      const token = await this.getSessionToken();
      const events = await ipcClient.audit.getEvents(_limit || 50, token);

      const allEvents = (Array.isArray(events) ? events : []) as Array<Record<string, unknown>>;
      const configEvents = allEvents
        .filter(e => String(e.resource_type || '') === 'configuration' || String(e.event_type || '').includes('config'))
        .map(e => ({
          id: String(e.id || ''),
          key: String(e.resource_id || ''),
          value: e.details || e.new_values,
          category: String(e.category || 'system'),
        }));

      return {
        success: true,
        data: configEvents,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration history',
        status: 500
      };
    }
  }

  static async getSystemStatus(): Promise<ServiceResponse<{ status: string; timestamp: string }>> {
    try {
      const healthResult = await ipcClient.admin.healthCheck();

      return {
        success: true,
        data: {
          status: typeof healthResult === 'string' && healthResult ? healthResult : 'healthy',
          timestamp: new Date().toISOString()
        },
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system status',
        status: 500
      };
    }
  }

  static async validateConfiguration(_config: Partial<Configuration>): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const errors: string[] = [];

      if (_config.key !== undefined && (!_config.key || typeof _config.key !== 'string')) {
        errors.push('Configuration key must be a non-empty string');
      }

      if (_config.value === undefined) {
        errors.push('Configuration value is required');
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to validate configuration');
    }
  }
}

export const configurationService = ConfigurationService;
