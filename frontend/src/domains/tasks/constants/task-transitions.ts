/**
 * Task Status Transition Rules — Frontend Single Source of Truth
 *
 * DEBT-21 | ADR-001
 *
 * This constant MUST mirror `src-tauri/src/domains/tasks/domain/services/task_state_machine.rs`
 * → `allowed_transitions()` exactly.  The Rust state machine is the canonical authority;
 * this TypeScript copy exists solely so the UI can derive button visibility and status
 * selector options without round-tripping to the backend.
 *
 * ⚠️  When you add or change a transition in the Rust state machine you MUST update
 *     this file in the same commit/PR and re-run the parity test:
 *       cd frontend && npm run test:ci -- task-transitions
 *
 * DO NOT scatter ad-hoc status comparisons across components.
 * Call the helpers exported from this module instead.
 */

import type { TaskStatus } from '@/lib/backend';

// ---------------------------------------------------------------------------
// Core transition map
// ---------------------------------------------------------------------------

/**
 * Maps every TaskStatus variant to the statuses that may legally follow it.
 *
 * Mirrors `task_state_machine.rs::allowed_transitions()` one-to-one.
 * Order within each array matches the Rust source for easy diff review.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  // ── creatable / pre-work states ─────────────────────────────────────────
  draft: ['pending', 'scheduled', 'cancelled'],

  pending: ['in_progress', 'scheduled', 'on_hold', 'cancelled', 'assigned'],

  scheduled: ['in_progress', 'on_hold', 'cancelled', 'assigned'],

  assigned: ['in_progress', 'on_hold', 'cancelled'],

  // ── active work states ───────────────────────────────────────────────────
  in_progress: ['completed', 'on_hold', 'paused', 'cancelled'],

  paused: ['in_progress', 'cancelled'],

  on_hold: ['pending', 'scheduled', 'in_progress', 'cancelled'],

  // ── post-completion states ───────────────────────────────────────────────
  completed: ['archived'],

  // ── terminal states (no further transitions) ────────────────────────────
  cancelled: [],

  archived: [],

  // ── exceptional / system states ─────────────────────────────────────────
  failed: ['cancelled'],

  overdue: ['in_progress', 'cancelled'],

  invalid: ['cancelled'],
} as const;

// ---------------------------------------------------------------------------
// Helper functions — use these everywhere instead of raw string comparisons
// ---------------------------------------------------------------------------

/**
 * Returns the statuses that `status` may legally transition to.
 * Returns an empty array for unknown/undefined values (defensive).
 */
export function getAllowedTransitions(status: TaskStatus): readonly TaskStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

/**
 * Returns `true` when the state machine allows `from → to`.
 * Mirrors `TaskStatus::can_transition_to()` in status.rs.
 */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Returns `true` when a PPF intervention can be started for a task in `status`.
 *
 * Semantically equivalent to asking "can this task transition to in_progress?"
 * Per the state machine: pending, scheduled, assigned, on_hold, paused, overdue → yes.
 * draft and completed → no.
 *
 * Replace every ad-hoc `status === 'pending' || status === 'draft'` check with this.
 */
export function canStartIntervention(status: TaskStatus): boolean {
  return canTransition(status, 'in_progress');
}

/**
 * Statuses from which there are no further transitions.
 * The task lifecycle is over once it reaches one of these.
 *
 * Note: `failed` and `invalid` are NOT terminal here because they can still
 * transition to `cancelled`.  Only true dead-ends are listed.
 */
export const TERMINAL_STATUSES = new Set<TaskStatus>([
  'completed',
  'cancelled',
  'archived',
] as const as TaskStatus[]);

/**
 * Returns `true` when the task has reached a terminal state
 * (no further transitions exist AND the work lifecycle is closed).
 *
 * Replace `status !== 'completed'` visibility guards with `!isTerminalStatus(status)`.
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Inverse of `isTerminalStatus`.
 * Returns `true` when there are still meaningful actions available for this task.
 */
export function isActiveStatus(status: TaskStatus): boolean {
  return !isTerminalStatus(status);
}

// ---------------------------------------------------------------------------
// Display labels (French) — used by status selector dropdowns
// ---------------------------------------------------------------------------

/**
 * Canonical French display label for each TaskStatus variant.
 * Kept here so every status-selector component renders consistently.
 */
export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  draft: 'Brouillon',
  pending: 'En attente',
  scheduled: 'Planifiée',
  assigned: 'Assignée',
  in_progress: 'En cours',
  paused: 'En pause',
  on_hold: 'En suspens',
  completed: 'Terminée',
  cancelled: 'Annulée',
  archived: 'Archivée',
  failed: 'Échouée',
  overdue: 'En retard',
  invalid: 'Invalide',
} as const;
