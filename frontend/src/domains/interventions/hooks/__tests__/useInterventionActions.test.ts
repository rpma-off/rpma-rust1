/**
 * useInterventionActions — session guard boundary tests
 *
 * Verifies that the `getRequiredSessionToken` helper fires before any IPC call
 * when no session is present, and that cache invalidation is skipped when
 * taskId is undefined (prevents empty-string cache key pollution).
 */
import { renderHook } from "@testing-library/react";
import { useInterventionActions } from "../useInterventionActions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(
    (opts: { mutationFn: (...args: unknown[]) => unknown }) => ({
      mutateAsync: opts.mutationFn,
    }),
  ),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock("../../services/intervention-workflow.service", () => ({
  InterventionWorkflowService: {
    startIntervention: jest.fn(),
    advanceStep: jest.fn(),
    finalizeIntervention: jest.fn(),
    saveStepProgress: jest.fn(),
  },
}));

const mockGetSession = jest.fn();
jest.mock("@/lib/secureStorage", () => ({
  AuthSecureStorage: {
    getSession: () => mockGetSession(),
  },
}));

jest.mock("@/lib/logging", () => ({
  logger: { error: jest.fn() },
}));
jest.mock("@/lib/logging/types", () => ({ LogDomain: { TASK: "task" } }));
jest.mock("../../services/intervention-mappers", () => ({
  mapBackendStepToFrontend: jest.fn((s) => s),
  mapBackendStepPartialUpdate: jest.fn((s) => s),
  mapBackendInterventionToFrontend: jest.fn((i) => i),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderActions(taskId?: string) {
  const { result } = renderHook(() => useInterventionActions({ taskId }));
  return result.current;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useInterventionActions — getRequiredSessionToken guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createIntervention throws before IPC when session is absent", async () => {
    mockGetSession.mockResolvedValue({ token: null });
    const { createInterventionMutation } = renderActions("task-1");
    const { InterventionWorkflowService } =
      await import("../../services/intervention-workflow.service");

    await expect(
      (
        createInterventionMutation as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync({ taskId: "task-1" }),
    ).rejects.toThrow("Authentication required");

    expect(
      InterventionWorkflowService.startIntervention,
    ).not.toHaveBeenCalled();
  });

  it("finalizeIntervention throws before IPC when session is absent", async () => {
    mockGetSession.mockResolvedValue({ token: undefined });
    const { finalizeInterventionMutation } = renderActions("task-1");
    const { InterventionWorkflowService } =
      await import("../../services/intervention-workflow.service");

    await expect(
      (
        finalizeInterventionMutation as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync({
        interventionId: "iv-1",
      }),
    ).rejects.toThrow("Authentication required");

    expect(
      InterventionWorkflowService.finalizeIntervention,
    ).not.toHaveBeenCalled();
  });
});

describe("useInterventionActions — empty taskId cache guard", () => {
  it("does not call invalidateQueries with empty string when taskId is undefined", async () => {
    mockGetSession.mockResolvedValue({ token: "tok" });
    const { InterventionWorkflowService } =
      await import("../../services/intervention-workflow.service");
    (
      InterventionWorkflowService.saveStepProgress as jest.Mock
    ).mockResolvedValue({
      success: true,
      data: {},
    });

    // Render WITHOUT a taskId
    const { saveStepProgressMutation } = renderActions(undefined);

    await (
      saveStepProgressMutation as unknown as {
        mutateAsync: (...args: unknown[]) => Promise<unknown>;
      }
    ).mutateAsync({
      stepId: "s-1",
      collectedData: {},
    });

    // invalidateQueries should NOT have been called (no taskId → no key)
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
