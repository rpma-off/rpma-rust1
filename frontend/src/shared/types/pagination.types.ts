/**
 * Canonical pagination parameter types — mirrors the Rust `PaginationParams`
 * struct in `src-tauri/src/shared/repositories/base.rs`.
 *
 * DEBT-08 / REF-08: Changing pagination behaviour requires editing this ONE
 * type + the `usePagination()` hook — not 8+ domain filter interfaces.
 */

/**
 * Input parameters for any paginated list query.
 * Matches the Rust `PaginationParams` struct exactly.
 */
export interface PaginationParams {
  /** 1-based page number. */
  page?: number | null;
  /** Items per page (max 200). */
  page_size?: number | null;
  /** Column to sort by (domain-specific default if omitted). */
  sort_by?: string | null;
  /** "asc" | "desc" (default: "desc"). */
  sort_order?: 'asc' | 'desc' | null;
}

/**
 * Standard paginated response shape.
 * Matches the Rust `PaginationInfo` struct.
 */
export interface PaginationInfo {
  page: number;
  /** Items per page (renamed from `limit` for consistency with PaginationParams). */
  limit: number;
  total: bigint | number;
  total_pages: number;
}

/**
 * Generic paginated list response.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
