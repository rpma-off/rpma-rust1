import type { Configuration, BusinessRule } from '../server';

export type AdminConfiguration = Configuration;
export type AdminBusinessRule = BusinessRule;

export interface AdminConfigurationState {
  configurations: AdminConfiguration[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseAdminActionsResult {
  createConfiguration: (payload: {
    key: string;
    value: unknown;
    category?: string;
  }) => Promise<boolean>;
  updateConfiguration: (
    id: string,
    updates: Partial<AdminConfiguration>
  ) => Promise<boolean>;
  deleteConfiguration: (id: string) => Promise<boolean>;
  updateBusinessRule: (
    id: string,
    updates: Partial<AdminBusinessRule>
  ) => Promise<boolean>;
  deleteBusinessRule: (id: string) => Promise<boolean>;
}
