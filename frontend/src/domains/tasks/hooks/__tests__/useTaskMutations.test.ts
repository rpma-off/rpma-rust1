/**
 * useTaskMutations — auth guard boundary tests
 *
 * These tests verify the `requireToken` contract: every mutation must throw
 * before reaching the IPC layer when the user session is absent.
 */
import { renderHook } from "@testing-library/react";
import { useTaskMutations } from "../useTaskMutations";

// ── Shared mocks ──────────────────────────────────────────────────────────────

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(
    (opts: { mutationFn: (...args: unknown[]) => unknown }) => ({
      mutateAsync: opts.mutationFn,
      mutate: opts.mutationFn,
      isPending: false,
      isError: false,
    }),
  ),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

jest.mock("../../ipc/task.ipc", () => ({
  taskIpc: {
    update: jest.fn(),
    delete: jest.fn(),
    editTask: jest.fn(),
    reportTaskIssue: jest.fn(),
    delayTask: jest.fn(),
    sendTaskMessage: jest.fn(),
  },
}));

// ── Auth mock — default: no session ──────────────────────────────────────────

const mockUseAuth = jest.fn();
jest.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderMutations(token: string | undefined) {
  mockUseAuth.mockReturnValue({ user: token ? { token } : null });
  const { result } = renderHook(() => useTaskMutations());
  return result.current;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useTaskMutations — auth guard (requireToken)", () => {
  const ERR = "Authentication required";

  it("updateTask throws when no session", async () => {
    const { updateTask } = renderMutations(undefined);
    await expect(
      (
        updateTask as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync({ taskId: "t1", data: {} }),
    ).rejects.toThrow(ERR);
  });

  it("deleteTask throws when no session", async () => {
    const { deleteTask } = renderMutations(undefined);
    await expect(
      (
        deleteTask as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync("t1"),
    ).rejects.toThrow(ERR);
  });

  it("editTask throws when no session", async () => {
    const { editTask } = renderMutations(undefined);
    await expect(
      (
        editTask as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync({ taskId: "t1", data: {} }),
    ).rejects.toThrow(ERR);
  });

  it("reportIssue throws when no session", async () => {
    const { reportIssue } = renderMutations(undefined);
    await expect(
      (
        reportIssue as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync({
        taskId: "t1",
        issueType: "mechanical",
        severity: "high",
        description: "Broken",
      }),
    ).rejects.toThrow(ERR);
  });

  it("does NOT throw when token is present", async () => {
    const { taskIpc } = await import("../../ipc/task.ipc");
    (taskIpc.update as jest.Mock).mockResolvedValue({ success: true });
    const { updateTask } = renderMutations("valid-token");
    await expect(
      (
        updateTask as unknown as {
          mutateAsync: (...args: unknown[]) => Promise<unknown>;
        }
      ).mutateAsync({ taskId: "t1", data: {} }),
    ).resolves.not.toThrow();
  });
});
