export { configurationService } from '@/domains/settings';
export type { Configuration, BusinessRule } from '@/domains/settings';

export interface BusinessRuleFiltersData {
  search?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  priority?: 'low' | 'medium' | 'high' | 'all';
  page?: number;
  limit?: number;
  pageSize?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface ConfigurationFiltersData {
  category?: string;
  search?: string;
  data_type?: string;
  is_required?: boolean;
  page?: number;
  limit?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  type?: string;
  isRequired?: boolean;
  isEncrypted?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}
