// ==================== CLIENT TYPES ====================

import { Client, ClientWithTasks } from '@/lib/backend';

// Re-export for backward compatibility
export type { Client, ClientWithTasks };

/**
 * Client type enumeration matching Rust CustomerType enum
 */
export type ClientType = 'individual' | 'business';

/**
 * Client creation request matching Rust backend
 */
export interface CreateClientRequest {
   name: string;
   email?: string;
   phone?: string;
   customer_type: ClientType;
   address_street?: string;
   address_city?: string;
   address_state?: string;
   address_zip?: string;
   address_country?: string;
   tax_id?: string;
   company_name?: string;
   contact_person?: string;
   notes?: string;
   tags?: string;
 }

/**
 * Client update request matching Rust backend
 */
export interface UpdateClientRequest {
   id: string;
   name?: string;
   email?: string;
   phone?: string;
   customer_type?: ClientType;
   address_street?: string;
   address_city?: string;
   address_state?: string;
   address_zip?: string;
   address_country?: string;
   tax_id?: string;
   company_name?: string;
   contact_person?: string;
   notes?: string;
   tags?: string;
 }

/**
 * Client filters for search and filtering (compatible with existing components)
 */
export interface ClientFilters {
  search?: string;
  customer_type?: ClientType;
  has_tasks?: boolean;
  created_after?: string;
  created_before?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'email' | 'created_at' | 'total_tasks';
  sort_order?: 'asc' | 'desc';
}

/**
 * Client search result (simplified for dropdowns/autocomplete)
 */
export interface ClientSearchResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  customer_type: ClientType;
  total_tasks: number;
  last_task_date?: string;
}

/**
 * Client statistics
 */
export interface ClientStats {
  total_clients: number;
  individual_clients: number;
  business_clients: number;
  clients_with_tasks: number;
  new_clients_this_month: number;
  top_clients: Array<{
    id: string;
    name: string;
    total_tasks: number;
  }>;
}

// ClientWithTasks is now defined in backend.ts

/**
 * Client form data (for form components)
 */
export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  company_name?: string;
   contact_person?: string;
   customer_type: ClientType;
   notes?: string;
   tags?: string;
 }

/**
 * Client validation errors
 */
export interface ClientValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company_name?: string;
  customer_type?: string;
  notes?: string;
}

/**
 * Client DTOs for service layer
 */
export interface CreateClientDTO {
  name: string;
  email?: string;
  phone?: string;
  customer_type: ClientType;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  tax_id?: string;
  company_name?: string;
  contact_person?: string;
  notes?: string;
  tags?: string;
}

export interface UpdateClientDTO extends Partial<CreateClientDTO> {
  id: string;
}

// ==================== REQUEST/RESPONSE TYPES ====================

/**
 * Client query parameters for Tauri commands
 */
export interface ClientQuery {
  page?: number;
  limit?: number;
  search?: string;
  customer_type?: ClientType;
  sort_by?: 'name' | 'email' | 'created_at' | 'total_tasks';
  sort_order?: 'asc' | 'desc';
}

/**
 * Client list response from Tauri command
 */
export interface ClientListResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: bigint;
    total_pages: number;
  };
}

/**
 * Client CRUD response types
 */
export type ClientResponse =
  | { type: 'Created'; data: Client }
  | { type: 'Found'; data: Client }
  | { type: 'Updated'; data: Client }
  | { type: 'Deleted' }
  | { type: 'List'; data: ClientListResponse }
  | { type: 'NotFound' };

/**
 * API response for client search
 */
export interface ClientSearchResponse {
  data: ClientSearchResult[];
  total: number;
}

/**
 * API response for client stats
 */
export interface ClientStatsResponse {
  data: ClientStats;
}

// ==================== COMPONENT PROPS TYPES ====================

/**
 * Client list component props
 */
export interface ClientListProps {
  clients: Client[];
  loading?: boolean;
  error?: string;
  onClientSelect?: (client: Client) => void;
  onClientEdit?: (client: Client) => void;
  onClientDelete?: (client: Client) => void;
  showActions?: boolean;
  selectable?: boolean;
  selectedClients?: string[];
  onSelectionChange?: (clientIds: string[]) => void;
}

/**
 * Client detail component props
 */
export interface ClientDetailProps {
  client: ClientWithTasks;
  loading?: boolean;
  error?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateTask?: () => void;
}

/**
 * Client form component props
 */
export interface ClientFormProps {
  client?: Client;
  onSubmit: (data: CreateClientDTO | UpdateClientDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

/**
 * Client filters component props
 */
export interface ClientFiltersProps {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  onReset: () => void;
  loading?: boolean;
}