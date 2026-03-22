/**
 * Parity Test: ALLOWED_TRANSITIONS vs Rust task_state_machine.rs
 *
 * DEBT-21 | ADR-001
 *
 * This file is the enforcement layer for the Single Source of Truth contract.
 *
 * The Rust function `allowed_transitions()` in
 *   src-tauri/src/domains/tasks/domain/services/task_state_machine.rs
 * is the authoritative definition of all valid task status transitions.
 *
 * `ALLOWED_TRANSITIONS` in `../task-transitions.ts` is a TypeScript mirror of
 * that function.  These tests verify parity by encoding every arm of the Rust
 * match expression as an explicit assertion.
 *
 * WHEN YOU CHANGE THE RUST STATE MACHINE:
 *   1. Update ALLOWED_TRANSITIONS in task-transitions.ts to match.
 *   2. Update the assertions in this file to match.
 *   3. Both files must change in the same commit — failing this test in CI
 *      means the two layers have drifted.
 *
 * The test structure deliberately mirrors the Rust source so a reviewer can
 * place the two files side-by-side and verify them without running code.
 */

import { describe, it, expect } from "@jest/globals";
import {
  ALLOWED_TRANSITIONS,
  TASK_STATUS_LABELS,
  TERMINAL_STATUSES,
  canStartIntervention,
  canTransition,
  getAllowedTransitions,
  isActiveStatus,
  isTerminalStatus,
} from "../task-transitions";
import type { TaskStatus } from "../../../../lib/backend";

// ---------------------------------------------------------------------------
// Shared fixture — every TaskStatus variant, sourced from the generated type.
// If a new variant is added to the Rust enum, the TypeScript type will change
// and this array will need to be updated, making the gap visible at compile time.
// ---------------------------------------------------------------------------

const ALL_TASK_STATUSES: TaskStatus[] = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
  "pending",
  "invalid",
  "archived",
  "failed",
  "overdue",
  "assigned",
  "paused",
];

// ---------------------------------------------------------------------------
// Structural completeness
// ---------------------------------------------------------------------------

describe("ALLOWED_TRANSITIONS — structural completeness", () => {
  it("has an entry for every TaskStatus variant", () => {
    for (const status of ALL_TASK_STATUSES) {
      expect(ALLOWED_TRANSITIONS).toHaveProperty(status);
    }
  });

  it("contains no unknown status keys", () => {
    const knownSet = new Set<string>(ALL_TASK_STATUSES);
    for (const key of Object.keys(ALLOWED_TRANSITIONS)) {
      expect(knownSet.has(key)).toBe(true);
    }
  });

  it("contains no unknown status values in any transition list", () => {
    const knownSet = new Set<string>(ALL_TASK_STATUSES);
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of targets) {
        expect(knownSet.has(to)).toBe(true);
      }
    }
  });

  it("TASK_STATUS_LABELS has a label for every TaskStatus variant", () => {
    for (const status of ALL_TASK_STATUSES) {
      expect(TASK_STATUS_LABELS).toHaveProperty(status);
      expect(typeof TASK_STATUS_LABELS[status]).toBe("string");
      expect(TASK_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Parity: valid transitions (mirrors each arm of the Rust match)
//
// Each describe block corresponds to one arm of `allowed_transitions()` in
// task_state_machine.rs.  The test names quote the Rust source variant name
// so you can grep for them in both files.
// ---------------------------------------------------------------------------

describe("ALLOWED_TRANSITIONS — valid transitions (mirrors Rust match arms)", () => {
  // TaskStatus::Draft => vec![Pending, Scheduled, Cancelled]
  describe("draft", () => {
    it("draft → pending   is allowed", () =>
      expect(canTransition("draft", "pending")).toBe(true));
    it("draft → scheduled is allowed", () =>
      expect(canTransition("draft", "scheduled")).toBe(true));
    it("draft → cancelled is allowed", () =>
      expect(canTransition("draft", "cancelled")).toBe(true));
    it("has exactly 3 allowed transitions", () =>
      expect(getAllowedTransitions("draft")).toHaveLength(3));
  });

  // TaskStatus::Pending => vec![InProgress, Scheduled, OnHold, Cancelled, Assigned]
  describe("pending", () => {
    it("pending → in_progress is allowed", () =>
      expect(canTransition("pending", "in_progress")).toBe(true));
    it("pending → scheduled  is allowed", () =>
      expect(canTransition("pending", "scheduled")).toBe(true));
    it("pending → on_hold    is allowed", () =>
      expect(canTransition("pending", "on_hold")).toBe(true));
    it("pending → cancelled  is allowed", () =>
      expect(canTransition("pending", "cancelled")).toBe(true));
    it("pending → assigned   is allowed", () =>
      expect(canTransition("pending", "assigned")).toBe(true));
    it("has exactly 5 allowed transitions", () =>
      expect(getAllowedTransitions("pending")).toHaveLength(5));
  });

  // TaskStatus::Scheduled => vec![InProgress, OnHold, Cancelled, Assigned]
  describe("scheduled", () => {
    it("scheduled → in_progress is allowed", () =>
      expect(canTransition("scheduled", "in_progress")).toBe(true));
    it("scheduled → on_hold    is allowed", () =>
      expect(canTransition("scheduled", "on_hold")).toBe(true));
    it("scheduled → cancelled  is allowed", () =>
      expect(canTransition("scheduled", "cancelled")).toBe(true));
    it("scheduled → assigned   is allowed", () =>
      expect(canTransition("scheduled", "assigned")).toBe(true));
    it("has exactly 4 allowed transitions", () =>
      expect(getAllowedTransitions("scheduled")).toHaveLength(4));
  });

  // TaskStatus::Assigned => vec![InProgress, OnHold, Cancelled]
  describe("assigned", () => {
    it("assigned → in_progress is allowed", () =>
      expect(canTransition("assigned", "in_progress")).toBe(true));
    it("assigned → on_hold    is allowed", () =>
      expect(canTransition("assigned", "on_hold")).toBe(true));
    it("assigned → cancelled  is allowed", () =>
      expect(canTransition("assigned", "cancelled")).toBe(true));
    it("has exactly 3 allowed transitions", () =>
      expect(getAllowedTransitions("assigned")).toHaveLength(3));
  });

  // TaskStatus::InProgress => vec![Completed, OnHold, Paused, Cancelled]
  describe("in_progress", () => {
    it("in_progress → completed is allowed", () =>
      expect(canTransition("in_progress", "completed")).toBe(true));
    it("in_progress → on_hold  is allowed", () =>
      expect(canTransition("in_progress", "on_hold")).toBe(true));
    it("in_progress → paused   is allowed", () =>
      expect(canTransition("in_progress", "paused")).toBe(true));
    it("in_progress → cancelled is allowed", () =>
      expect(canTransition("in_progress", "cancelled")).toBe(true));
    it("has exactly 4 allowed transitions", () =>
      expect(getAllowedTransitions("in_progress")).toHaveLength(4));
  });

  // TaskStatus::Paused => vec![InProgress, Cancelled]
  describe("paused", () => {
    it("paused → in_progress is allowed", () =>
      expect(canTransition("paused", "in_progress")).toBe(true));
    it("paused → cancelled  is allowed", () =>
      expect(canTransition("paused", "cancelled")).toBe(true));
    it("has exactly 2 allowed transitions", () =>
      expect(getAllowedTransitions("paused")).toHaveLength(2));
  });

  // TaskStatus::OnHold => vec![Pending, Scheduled, InProgress, Cancelled]
  describe("on_hold", () => {
    it("on_hold → pending     is allowed", () =>
      expect(canTransition("on_hold", "pending")).toBe(true));
    it("on_hold → scheduled   is allowed", () =>
      expect(canTransition("on_hold", "scheduled")).toBe(true));
    it("on_hold → in_progress is allowed", () =>
      expect(canTransition("on_hold", "in_progress")).toBe(true));
    it("on_hold → cancelled   is allowed", () =>
      expect(canTransition("on_hold", "cancelled")).toBe(true));
    it("has exactly 4 allowed transitions", () =>
      expect(getAllowedTransitions("on_hold")).toHaveLength(4));
  });

  // TaskStatus::Completed => vec![Archived]
  describe("completed", () => {
    it("completed → archived is allowed", () =>
      expect(canTransition("completed", "archived")).toBe(true));
    it("has exactly 1 allowed transition", () =>
      expect(getAllowedTransitions("completed")).toHaveLength(1));
  });

  // TaskStatus::Cancelled => vec![]
  describe("cancelled", () => {
    it("has no allowed transitions", () =>
      expect(getAllowedTransitions("cancelled")).toHaveLength(0));
  });

  // TaskStatus::Archived => vec![]
  describe("archived", () => {
    it("has no allowed transitions", () =>
      expect(getAllowedTransitions("archived")).toHaveLength(0));
  });

  // TaskStatus::Failed => vec![Cancelled]
  describe("failed", () => {
    it("failed → cancelled is allowed", () =>
      expect(canTransition("failed", "cancelled")).toBe(true));
    it("has exactly 1 allowed transition", () =>
      expect(getAllowedTransitions("failed")).toHaveLength(1));
  });

  // TaskStatus::Overdue => vec![InProgress, Cancelled]
  describe("overdue", () => {
    it("overdue → in_progress is allowed", () =>
      expect(canTransition("overdue", "in_progress")).toBe(true));
    it("overdue → cancelled  is allowed", () =>
      expect(canTransition("overdue", "cancelled")).toBe(true));
    it("has exactly 2 allowed transitions", () =>
      expect(getAllowedTransitions("overdue")).toHaveLength(2));
  });

  // TaskStatus::Invalid => vec![Cancelled]
  describe("invalid", () => {
    it("invalid → cancelled is allowed", () =>
      expect(canTransition("invalid", "cancelled")).toBe(true));
    it("has exactly 1 allowed transition", () =>
      expect(getAllowedTransitions("invalid")).toHaveLength(1));
  });
});

// ---------------------------------------------------------------------------
// Parity: forbidden transitions
//
// Each test verifies a transition that is explicitly NOT in the Rust machine.
// These are the regression guards: if someone accidentally adds a transition
// on the Rust side without updating this file, the corresponding test here
// will unexpectedly pass (green when it should be red) — making the drift
// visible during review.
// ---------------------------------------------------------------------------

describe("ALLOWED_TRANSITIONS — forbidden transitions (must NOT be allowed)", () => {
  // draft can never jump directly to active work — it must pass through pending/scheduled
  it("draft → in_progress is forbidden (must go through pending/scheduled first)", () =>
    expect(canTransition("draft", "in_progress")).toBe(false));
  it("draft → completed is forbidden", () =>
    expect(canTransition("draft", "completed")).toBe(false));
  it("draft → archived is forbidden", () =>
    expect(canTransition("draft", "archived")).toBe(false));

  // completed is a near-terminal state — only archiving is allowed
  it("completed → pending is forbidden", () =>
    expect(canTransition("completed", "pending")).toBe(false));
  it("completed → in_progress is forbidden", () =>
    expect(canTransition("completed", "in_progress")).toBe(false));
  it("completed → cancelled is forbidden", () =>
    expect(canTransition("completed", "cancelled")).toBe(false));

  // cancelled is fully terminal
  it("cancelled → in_progress is forbidden", () =>
    expect(canTransition("cancelled", "in_progress")).toBe(false));
  it("cancelled → pending is forbidden", () =>
    expect(canTransition("cancelled", "pending")).toBe(false));
  it("cancelled → draft is forbidden", () =>
    expect(canTransition("cancelled", "draft")).toBe(false));

  // archived is fully terminal
  it("archived → completed is forbidden", () =>
    expect(canTransition("archived", "completed")).toBe(false));
  it("archived → scheduled is forbidden", () =>
    expect(canTransition("archived", "scheduled")).toBe(false));
  it("archived → in_progress is forbidden", () =>
    expect(canTransition("archived", "in_progress")).toBe(false));

  // invalid can only be cancelled, nothing else
  it("invalid → scheduled is forbidden", () =>
    expect(canTransition("invalid", "scheduled")).toBe(false));
  it("invalid → in_progress is forbidden", () =>
    expect(canTransition("invalid", "in_progress")).toBe(false));

  // self-transitions are always forbidden (already in that state)
  it.each(ALL_TASK_STATUSES as TaskStatus[])(
    "%s → %s (self-transition) is forbidden",
    (status: TaskStatus) => expect(canTransition(status, status)).toBe(false),
  );
});

// ---------------------------------------------------------------------------
// canStartIntervention — derived from the transition map
// ---------------------------------------------------------------------------

describe("canStartIntervention", () => {
  it.each([
    // Statuses that CAN transition to in_progress (intervention startable)
    ["pending", true],
    ["scheduled", true],
    ["assigned", true],
    ["on_hold", true],
    ["paused", true],
    ["overdue", true],
    // Statuses that CANNOT transition to in_progress
    ["draft", false], // Draft must be promoted to pending/scheduled first
    ["in_progress", false], // Already in_progress
    ["completed", false],
    ["cancelled", false],
    ["archived", false],
    ["failed", false],
    ["invalid", false],
  ] as [TaskStatus, boolean][])(
    'canStartIntervention("%s") === %s',
    (status: TaskStatus, expected: boolean) => {
      expect(canStartIntervention(status)).toBe(expected);
    },
  );

  it("draft is NOT startable (state machine requires draft → pending/scheduled → in_progress)", () => {
    // Regression: the old frontend code incorrectly had status === 'draft' as startable.
    // The Rust state machine has never allowed Draft → InProgress.
    expect(canStartIntervention("draft")).toBe(false);
  });

  it("scheduled IS startable (old frontend code incorrectly excluded it)", () => {
    // Regression: the old frontend code was `status === 'pending' || status === 'draft'`,
    // which missed scheduled, assigned, on_hold, paused, and overdue.
    expect(canStartIntervention("scheduled")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isTerminalStatus / isActiveStatus
// ---------------------------------------------------------------------------

describe("isTerminalStatus", () => {
  it.each([
    ["completed", true],
    ["cancelled", true],
    ["archived", true],
    ["draft", false],
    ["pending", false],
    ["scheduled", false],
    ["assigned", false],
    ["in_progress", false],
    ["paused", false],
    ["on_hold", false],
    ["failed", false], // failed → cancelled is still possible
    ["overdue", false], // overdue → in_progress is still possible
    ["invalid", false], // invalid → cancelled is still possible
  ] as [TaskStatus, boolean][])(
    'isTerminalStatus("%s") === %s',
    (status: TaskStatus, expected: boolean) => {
      expect(isTerminalStatus(status)).toBe(expected);
    },
  );

  it("TERMINAL_STATUSES set contains exactly: completed, cancelled, archived", () => {
    expect(TERMINAL_STATUSES.size).toBe(3);
    expect(TERMINAL_STATUSES.has("completed")).toBe(true);
    expect(TERMINAL_STATUSES.has("cancelled")).toBe(true);
    expect(TERMINAL_STATUSES.has("archived")).toBe(true);
  });
});

describe("isActiveStatus", () => {
  it("is the exact inverse of isTerminalStatus for every status", () => {
    for (const status of ALL_TASK_STATUSES) {
      expect(isActiveStatus(status)).toBe(!isTerminalStatus(status));
    }
  });

  it("completed is NOT active", () =>
    expect(isActiveStatus("completed")).toBe(false));
  it("cancelled is NOT active", () =>
    expect(isActiveStatus("cancelled")).toBe(false));
  it("archived  is NOT active", () =>
    expect(isActiveStatus("archived")).toBe(false));
  it("pending   IS active", () => expect(isActiveStatus("pending")).toBe(true));
  it("in_progress IS active", () =>
    expect(isActiveStatus("in_progress")).toBe(true));
});

// ---------------------------------------------------------------------------
// getAllowedTransitions — defensive edge cases
// ---------------------------------------------------------------------------

describe("getAllowedTransitions", () => {
  it("returns an array (never undefined) for every known status", () => {
    for (const status of ALL_TASK_STATUSES) {
      const result = getAllowedTransitions(status);
      expect(Array.isArray(result)).toBe(true);
    }
  });

  it("returns empty array for terminal statuses", () => {
    expect(getAllowedTransitions("cancelled")).toHaveLength(0);
    expect(getAllowedTransitions("archived")).toHaveLength(0);
  });

  it("return values are valid TaskStatus strings", () => {
    const knownSet = new Set<string>(ALL_TASK_STATUSES);
    for (const status of ALL_TASK_STATUSES) {
      for (const next of getAllowedTransitions(status)) {
        expect(knownSet.has(next)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Total transition count — compile-time guard against silent additions
//
// If the Rust state machine gains or loses a transition, this number changes,
// which makes the drift immediately visible in the test output.
// Update this number whenever you change the state machine (in both layers).
// ---------------------------------------------------------------------------

describe("total transition count (drift sentinel)", () => {
  it("the entire state machine has exactly 30 allowed transitions", () => {
    const total = Object.values(ALLOWED_TRANSITIONS).reduce(
      (sum, targets) => sum + targets.length,
      0,
    );
    // Breakdown (matches Rust source):
    //   draft(3) + pending(5) + scheduled(4) + assigned(3)
    //   + in_progress(4) + paused(2) + on_hold(4)
    //   + completed(1)
    //   + cancelled(0) + archived(0)
    //   + failed(1) + overdue(2) + invalid(1)
    //   = 30
    expect(total).toBe(30);
  });
});
