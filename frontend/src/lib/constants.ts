/** Pagination defaults used across all list queries. */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  USER_LIST_SIZE: 50,
  CONFIG_LIST_SIZE: 100,
} as const;

/** Timing constants for intervals, delays and refresh cycles. */
export const TIMING = {
  /** Flush interval for remote log batching (ms). */
  LOG_FLUSH_INTERVAL_MS: 5000,
  /** Default auto-refresh interval for preference forms (seconds). */
  DEFAULT_REFRESH_INTERVAL_SECS: 60,
} as const;

/**
 * Canonical role string values — must stay in sync with the Rust
 * `UserRole` enum which serialises to lowercase (`serde(rename_all = "lowercase")`).
 */
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Canonical task status strings — must stay in sync with the Rust
 * `TaskStatus` enum's `Display` impl.
 */
export const TASK_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  PENDING: 'pending',
  ARCHIVED: 'archived',
  FAILED: 'failed',
  OVERDUE: 'overdue',
  ASSIGNED: 'assigned',
  PAUSED: 'paused',
} as const;

/**
 * Canonical quote status strings — must stay in sync with the Rust
 * `QuoteStatus` enum's `Display` impl.
 */
export const QUOTE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
  CHANGES_REQUESTED: 'changes_requested',
} as const;
