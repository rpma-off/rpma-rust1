// ==================== QUOTE (DEVIS) TYPES ====================

/**
 * Quote status matching Rust QuoteStatus enum
 */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'changes_requested';

/**
 * Quote item kind matching Rust QuoteItemKind enum
 */
export type QuoteItemKind = 'labor' | 'material' | 'service' | 'discount';

/**
 * Attachment type matching Rust AttachmentType enum
 */
export type AttachmentType = 'image' | 'document' | 'other';

/**
 * Quote entity matching Rust Quote struct
 */
export interface Quote {
  id: string;
  title: string;
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
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  vehicle_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_vin: string | null;
  customer_message?: string | null;
  public_token?: string | null;
  shared_at?: string | null;
  view_count?: number | null;
  last_viewed_at?: string | null;
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
 * Quote attachment entity matching Rust QuoteAttachment struct
 */
export interface QuoteAttachment {
  id: string;
  quote_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  attachment_type: AttachmentType;
  description: string | null;
  include_in_invoice: boolean;
  created_at: string;
  created_by: string | null;
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
  discount_amount?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
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
  discount_type?: string | null;
  discount_value?: number | null;
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
 * Create quote attachment request
 */
export interface CreateQuoteAttachmentRequest {
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  attachment_type?: AttachmentType | null;
  description?: string | null;
  include_in_invoice?: boolean;
}

/**
 * Update quote attachment request
 */
export interface UpdateQuoteAttachmentRequest {
  description?: string | null;
  attachment_type?: AttachmentType | null;
  include_in_invoice?: boolean;
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
 * Quote filters for list page
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

/**
 * Quote part for parts section
 */
export interface QuotePart {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

/**
 * Quote labor item for labor section
 */
export interface QuoteLaborItem {
  id: string;
  name: string;
  description?: string;
  hours: number;
  hourlyRate: number;
}

/**
 * Quote page stats for status tabs
 */
export interface QuotePageStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  converted: number;
  changes_requested: number;
}

export function computeQuoteStats(quotes: any[]): QuotePageStats {
  const stats = {
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    converted: 0,
    changes_requested: 0,
  };

  quotes.forEach(q => {
    stats.total++;
    const status = q.status as QuoteStatus;
    if (status && stats[status as keyof QuotePageStats] !== undefined) {
      (stats as any)[status]++;
    }
  });

  return stats;
}

/**
 * Quote part input for parts section
 */
export interface QuotePartInput {
  part_number: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * Quote labor input for labor section
 */
export interface QuoteLaborInput {
  description: string;
  hours: number;
  rate: number;
  total: number;
}
