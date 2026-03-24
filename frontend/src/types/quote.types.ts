/// =============================================================================
// QUOTE TYPES
//
// Frontend transport-safe compatibility layer for quote contracts.
//
// ADR-015 source of truth remains Rust + generated `@/lib/backend` types, but
// several quote payloads include `i64` fields that generate as `bigint` in TS.
// At runtime over JSON/Tauri IPC, those values are consumed as JS `number`.
//
// This file therefore:
// - re-exports enum-like/generated-safe types directly from `@/lib/backend`
// - defines transport-safe aliases for bigint-bearing quote entities/requests
// - keeps frontend-only UI helper types local
// =============================================================================

// ── Safe re-exports from generated backend contract ───────────────────────────

export type {
  QuoteStatus,
  QuoteItemKind,
  AttachmentType,
  QuoteExportResponse,
} from "@/lib/backend";

// ── Transport-safe compatibility contracts ────────────────────────────────────

/**
 * Update quote attachment request.
 *
 * Generated backend contract uses required nullable fields; frontend callers
 * often patch one field at a time. Keep this compatibility shape permissive.
 */
export interface UpdateQuoteAttachmentRequest {
  description?: string | null;
  attachment_type?: import("@/lib/backend").AttachmentType | null;
}

/**
 * Frontend query shape used by list screens and hooks.
 *
 * The generated backend contract nests pagination under `pagination`, but the
 * existing frontend uses flat query params. Keep this transport-safe adapter
 * shape here for compatibility.
 */
export interface QuoteQuery {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: string;
  status?: import("@/lib/backend").QuoteStatus | null;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

/**
 * Quote list response consumed by list hooks/pages.
 *
 * Numeric totals are JS numbers at the frontend boundary.
 */
export interface QuoteListResponse {
  data: Quote[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Monthly aggregate count.
 */
export interface QuoteMonthlyCount {
  month: string;
  count: number;
}

/**
 * Quote statistics payload consumed by dashboards/hooks.
 */
export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  converted: number;
  monthly_counts: QuoteMonthlyCount[];
}

/**
 * Response for quote acceptance workflow.
 */
export interface QuoteAcceptResponse {
  quote: Quote;
  task_created: { task_id: string } | null;
}

/**
 * Response for quote-to-task conversion workflow.
 */
export interface ConvertQuoteToTaskResponse {
  quote: Quote;
  task_id: string;
  task_number: string;
}

/**
 * Quote entity.
 *
 * All monetary / i64-like fields are numbers in frontend code.
 */
export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  task_id: string | null;
  status: import("@/lib/backend").QuoteStatus;
  valid_until: string | null;
  description: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number | null;
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
 * Quote item entity.
 */
export interface QuoteItem {
  id: string;
  quote_id: string;
  kind: import("@/lib/backend").QuoteItemKind;
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
 * Quote attachment entity.
 */
export interface QuoteAttachment {
  id: string;
  quote_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  attachment_type: import("@/lib/backend").AttachmentType;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * Create quote request.
 *
 * `valid_until` and discount values are numbers at the frontend boundary.
 */
export interface CreateQuoteRequest {
  client_id: string;
  task_id?: string | null;
  valid_until?: number | null;
  description?: string | null;
  notes?: string | null;
  terms?: string | null;
  vehicle_plate?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  vehicle_vin?: string | null;
  discount_type?: "none" | "percentage" | "fixed" | string | null;
  discount_value?: number | null;
  items?: CreateQuoteItemRequest[];
}

/**
 * Update quote request.
 */
export interface UpdateQuoteRequest {
  valid_until?: number | null;
  description?: string | null;
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
 * Create quote item request.
 */
export interface CreateQuoteItemRequest {
  kind: import("@/lib/backend").QuoteItemKind;
  label: string;
  description?: string | null;
  qty: number;
  unit_price: number;
  tax_rate?: number | null;
  material_id?: string | null;
  position?: number;
}

/**
 * Update quote item request.
 */
export interface UpdateQuoteItemRequest {
  kind?: import("@/lib/backend").QuoteItemKind;
  label?: string;
  description?: string | null;
  qty?: number;
  unit_price?: number;
  tax_rate?: number | null;
  material_id?: string | null;
  position?: number;
}

/**
 * Create quote attachment request.
 */
export interface CreateQuoteAttachmentRequest {
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  attachment_type?: import("@/lib/backend").AttachmentType | null;
  description?: string | null;
}

// ── Frontend-only helper/view-model types ─────────────────────────────────────

/**
 * Frontend filter state for quote list pages.
 */
export interface QuoteFilters {
  search?: string;
  status?: import("@/lib/backend").QuoteStatus | null;
  client_id?: string | null;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  [key: string]: string | number | null | undefined;
}

/**
 * UI stats shown in quote page status summaries.
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

/**
 * Quote builder part line item.
 */
export interface QuotePart {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

/**
 * Quote builder labor line item.
 */
export interface QuoteLaborItem {
  id: string;
  name: string;
  description?: string;
  hours: number;
  hourlyRate: number;
}

/**
 * Parts section input model.
 */
export interface QuotePartInput {
  part_number: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * Labor section input model.
 */
export interface QuoteLaborInput {
  description: string;
  hours: number;
  rate: number;
  total: number;
}
