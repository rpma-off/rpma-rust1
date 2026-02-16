// ==================== QUOTE (DEVIS) TYPES ====================

/**
 * Quote status matching Rust QuoteStatus enum
 */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/**
 * Quote item kind matching Rust QuoteItemKind enum
 */
export type QuoteItemKind = 'labor' | 'material' | 'service' | 'discount';

/**
 * Quote entity matching Rust Quote struct
 */
export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  task_id: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  vehicle_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_vin: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  items: QuoteItem[];
}

/**
 * Quote item entity matching Rust QuoteItem struct
 */
export interface QuoteItem {
  id: string;
  quote_id: string;
  kind: QuoteItemKind;
  label: string;
  description: string | null;
  qty: number;
  unit_price: number;
  tax_rate: number | null;
  material_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Quote query parameters for listing
 */
export interface QuoteQuery {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: string;
  status?: QuoteStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
}

/**
 * Quote list response
 */
export interface QuoteListResponse {
  data: Quote[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create quote request
 */
export interface CreateQuoteRequest {
  client_id: string;
  task_id?: string | null;
  valid_until?: number | null;
  notes?: string | null;
  terms?: string | null;
  vehicle_plate?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  vehicle_vin?: string | null;
  items?: CreateQuoteItemRequest[];
}

/**
 * Update quote request
 */
export interface UpdateQuoteRequest {
  valid_until?: number | null;
  notes?: string | null;
  terms?: string | null;
  vehicle_plate?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  vehicle_vin?: string | null;
}

/**
 * Create quote item request
 */
export interface CreateQuoteItemRequest {
  kind: QuoteItemKind;
  label: string;
  description?: string | null;
  qty: number;
  unit_price: number;
  tax_rate?: number | null;
  material_id?: string | null;
  position?: number;
}

/**
 * Update quote item request
 */
export interface UpdateQuoteItemRequest {
  kind?: QuoteItemKind;
  label?: string;
  description?: string | null;
  qty?: number;
  unit_price?: number;
  tax_rate?: number | null;
  material_id?: string | null;
  position?: number;
}

/**
 * Quote accept response (may include task creation info)
 */
export interface QuoteAcceptResponse {
  quote: Quote;
  task_created: { task_id: string } | null;
}

/**
 * Quote PDF export response
 */
export interface QuoteExportResponse {
  file_path: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/**
 * Quote filters for the list page
 */
export interface QuoteFilters {
  search?: string;
  status?: QuoteStatus | null;
  client_id?: string | null;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: string | number | null | undefined;
}
