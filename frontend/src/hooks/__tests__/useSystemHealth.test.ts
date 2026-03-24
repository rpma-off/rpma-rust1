import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSystemHealth } from "@/domains/admin";

// ── Mock ipcClient so the hook never hits real Tauri IPC ─────────────────────
const mockGetHealthStatus = jest.fn();

jest.mock("@/lib/ipc", () => ({
  ipcClient: {
    system: {
      getHealthStatus: (...args: unknown[]) => mockGetHealthStatus(...args),
    },
  },
  // Keep the rest of the barrel exports as no-ops so imports don't explode.
  safeInvoke: jest.fn(),
  IPC_COMMANDS: {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh QueryClient + wrapper component per test so query caches
 * never bleed across test cases.
 */
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable automatic retries so error cases settle immediately.
        retry: false,
        // Zero staleTime means invalidation always triggers a real refetch,
        // which is what we want when testing `refresh()`.
        staleTime: 0,
        // Disable the garbage-collector delay to keep tests fast.
        gcTime: 0,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  }

  return { Wrapper, queryClient };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useSystemHealth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns healthy status when health check succeeds", async () => {
    mockGetHealthStatus.mockResolvedValue({
      status: "healthy",
      components: {
        database: {
          status: "healthy",
          message: "OK",
          lastChecked: "2026-01-01T00:00:00Z",
        },
      },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSystemHealth({ pollInterval: 60_000 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.systemStatus).toBe("healthy");
    expect(result.current.statusDetails).not.toBeNull();
    expect(result.current.statusDetails?.status).toBe("healthy");
  });

  it("returns error status when health check fails", async () => {
    mockGetHealthStatus.mockRejectedValue(new Error("Connection failed"));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSystemHealth({ pollInterval: 60_000 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.systemStatus).toBe("error");
  });

  it("provides a refresh function that re-checks health", async () => {
    mockGetHealthStatus.mockResolvedValue({ status: "healthy" });

    const { Wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(
      () => useSystemHealth({ pollInterval: 60_000 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.systemStatus).toBe("healthy");

    // Change the mock response for the next fetch.
    mockGetHealthStatus.mockResolvedValue({ status: "warning" });

    await act(async () => {
      await result.current.refresh();
    });

    // After invalidation + refetch the hook should reflect the new status.
    await waitFor(() => {
      expect(result.current.systemStatus).toBe("warning");
    });

    expect(result.current.refreshing).toBe(false);
    // Verify the queryClient actually called the backend again.
    expect(mockGetHealthStatus).toHaveBeenCalledTimes(2);

    // Suppress the unused-variable lint warning; queryClient is kept in scope
    // intentionally so the GC doesn't destroy the cache mid-test.
    void queryClient;
  });

  it("does not auto-check when autoStart is false", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSystemHealth({ autoStart: false }), {
      wrapper: Wrapper,
    });

    // Give React a tick to settle; the query should stay in `loading: false`
    // because `enabled: false` prevents it from ever firing.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(mockGetHealthStatus).not.toHaveBeenCalled();
  });
});
