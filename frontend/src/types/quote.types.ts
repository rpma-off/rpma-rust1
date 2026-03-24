// =============================================================================
// QUOTE TYPES
//
// Enum types and pure-DTO response types are re-exported from the auto-generated
// backend contract (`@/lib/backend`) so they never drift from the Rust source.
//
// Monetary-field entity/request types intentionally use `number` instead of
// `bigint` because Tauri's IPC layer serialises Rust i64 values via JSON, which
// means the runtime value that arrives in the browser is always a JS `number`.
// Using `bigint` here would compile but fail at runtime.  If the serialisation
// strategy ever changes (e.g. BSON / structured clone), revisit these types.
// =============================================================================

// ── Re-exports from generated backend contract ────────────────────────────────
// Safe re-exports: pure enum / structural types with no bigint fields.
// Types that reference monetary fields (Quote, QuoteItem, etc.) are kept as
// local definitions below so they use `number` instead of `bigint`.
export type {
  QuoteStatus,
  QuoteItemKind,
  AttachmentType,
  QuoteExportResponse,
} from "@/lib/backend";

/**
 * Update quote attachment request.
 * Fields are optional so callers can patch a single field without providing
 * the full object.  The backend accepts null for fields that are not changing.
 */
export interface UpdateQuoteAttachmentRequest {
  description?: string | null;
  attachment_type?: import("@/lib/backend").AttachmentType | null;
}

// ── Types kept local because they embed bigint-bearing entity types ───────────

/** Quote query parameters for listing (frontend optional-field variant). */
export interface QuoteQuery {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: string;
  status?: import("@/lib/backend").QuoteStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
}

/** Quote list response – `total` is a JSON number despite Rust i64. */
export interface QuoteListResponse {
  data: Quote[];
  total: number;
  page: number;
  limit: number;
}

/**
 * One month's quote count – `count` is a JSON number despite Rust i64.
 */
export interface QuoteMonthlyCount {
  /** e.g. "2026-03" */
  month: string;
  /** Serialised as JSON number despite Rust i64. */
  count: number;
}

/**
 * Aggregate statistics for all quotes – all numeric fields are JSON numbers
 * despite Rust i64 at the backend.
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

/** Response for the accept-quote action. */
export interface QuoteAcceptResponse {
  quote: Quote;
  task_created: { task_id: string } | null;
}

/** Response for the convert-to-task action. */
export interface ConvertQuoteToTaskResponse {
  quote: Quote;
  task_id: string;
  task_number: string;
}

// ── Entity types (monetary fields kept as `number` for JSON transport) ────────

/**
 * Quote entity – monetary fields are `number` at the JS boundary even though
 * the Rust struct uses `i64` (serialised as a JSON number, not a BigInt).
 */
export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  task_id: string | null;
  status: import("@/lib/backend").QuoteStatus;
  valid_until: string | null;
  /** Public-facing description shown to the customer. */
  description: string | null;
  /** Internal notes (staff only). */
  notes: string | null;
  terms: string | null;
  /** Serialised as JSON number despite Rust i64. */
  subtotal: number;
  /** Serialised as JSON number despite Rust i64. */
  tax_total: number;
  /** Serialised as JSON number despite Rust i64. */
  total: number;
  discount_type: string | null;
  /** Serialised as JSON number despite Rust i64. */
  discount_value: number | null;
  /** Serialised as JSON number despite Rust i64. */
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
 * Quote item entity – `unit_price` is `number` at the JS boundary.
 */
export interface QuoteItem {
  id: string;
  quote_id: string;
  kind: import("@/lib/backend").QuoteItemKind;
  label: string;
  description: string | null;
  qty: number;
  /** Serialised as JSON number despite Rust i64. */
  unit_price: number;
  tax_rate: number | null;
  material_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Quote attachment entity – `file_size` is `number` at the JS boundary.
 */
export interface QuoteAttachment {
  id: string;
  quote_id: string;
  file_name: string;
  file_path: string;
  /** Serialised as JSON number despite Rust i64. */
  file_size: number;
  mime_type: string;
  attachment_type: import("@/lib/backend").AttachmentType;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

// ── Request types (outbound – numeric fields stay as `number`) ────────────────

/**
 * Create quote request.  `valid_until` is a Unix timestamp in seconds; sent
 * as a JSON number rather than BigInt.
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
  discount_type?: "none" | "percentage" | "fixed" | null;
  discount_value?: number | null;
  items?: CreateQuoteItemRequest[];
}

/** Update quote request. */
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

/** Create quote item request. */
export interface CreateQuoteItemRequest {
  kind: import("@/lib/backend").QuoteItemKind;
  label: string;
  description?: string | null;
  qty: number;
  /** Serialised as JSON number despite Rust i64. */
  unit_price: number;
  tax_rate?: number | null;
  material_id?: string | null;
  position?: number;
}

/** Update quote item request. */
export interface UpdateQuoteItemRequest {
  kind?: import("@/lib/backend").QuoteItemKind;
  label?: string;
  description?: string | null;
  qty?: number;
  /** Serialised as JSON number despite Rust i64. */
  unit_price?: number;
  tax_rate?: number | null;
  material_id?: string | null;
  position?: number;
}

/** Create quote attachment request. */
export interface CreateQuoteAttachmentRequest {
  file_name: string;
  file_path: string;
  /** Serialised as JSON number despite Rust i64. */
  file_size: number;
  mime_type: string;
  attachment_type?: import("@/lib/backend").AttachmentType | null;
  description?: string | null;
}

// ── Frontend-only types (no backend equivalent) ───────────────────────────────

/** Frontend filter state for the quotes list page. */
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

/** Aggregate stats displayed in the status tab bar of the quotes list page. */
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

/** Part line item used in the quote builder UI. */
export interface QuotePart {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

/** Labor line item used in the quote builder UI. */
export interface QuoteLaborItem {
  id: string;
  name: string;
  description?: string;
  hours: number;
  hourlyRate: number;
}

/** Input shape for the parts section of the quote form. */
export interface QuotePartInput {
  part_number: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/** Input shape for the labor section of the quote form. */
export interface QuoteLaborInput {
  description: string;
  hours: number;
  rate: number;
  total: number;
}
