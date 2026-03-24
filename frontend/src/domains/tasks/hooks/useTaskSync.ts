import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskStatus, TaskPriority } from "@/lib/backend";
import { taskKeys } from "@/lib/query-keys";
import { useMutationCounter } from "@/lib/data-freshness";
import { logger } from "@/lib/logger";
import type { TaskWithDetails } from "@/types/task.types";
import { taskIpc } from "../ipc/task.ipc";

interface TaskFilters {
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  search: string;
  assignedTo?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
}

interface TaskPagination {
  page: number;
  total: number;
  totalPages: number;
  limit: number;
}

interface UseTaskSyncProps {
  userToken?: string;
  filters: TaskFilters;
  pageSize: number;
  autoFetch?: boolean;
  onTasksLoaded?: (
    tasks: TaskWithDetails[],
    pagination: TaskPagination,
  ) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: Error | null) => void;
}

/**
 * Task list synchronisation hook — ADR-014 compliant.
 *
 * Replaces the previous `useEffect` + imperative `fetchTasks()` approach with
 * a declarative `useQuery` that reacts to filter / page / mutation changes.
 *
 * Backward-compatible bridge: the existing callback props (`onTasksLoaded`,
 * `onLoadingChange`, `onError`) are forwarded via lightweight effects so that
 * `useTasks` (the main consumer) keeps working without changes.
 */
export function useTaskSync({
  userToken,
  filters,
  pageSize,
  autoFetch = true,
  onTasksLoaded,
  onLoadingChange,
  onError,
}: UseTaskSyncProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const tasksMutations = useMutationCounter("tasks");

  // ── Stable callback refs (avoid stale closures & infinite effect loops) ──
  const callbacksRef = useRef({ onTasksLoaded, onLoadingChange, onError });
  useEffect(() => {
    callbacksRef.current = { onTasksLoaded, onLoadingChange, onError };
  });

  // ── Reset to page 1 when filters change ──────────────────────────────────
  const filtersRef = useRef(filters);
  useEffect(() => {
    if (filtersRef.current !== filters) {
      filtersRef.current = filters;
      setPage(1);
    }
  }, [filters]);

  // ── Invalidate list queries when a mutation is signalled ──────────────────
  useEffect(() => {
    if (tasksMutations > 0) {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }
  }, [tasksMutations, queryClient]);

  // ── Build query params from filters + page ────────────────────────────────
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      status: filters.status !== "all" ? filters.status : undefined,
      search: filters.search || undefined,
      technician_id: filters.assignedTo || undefined,
      from_date: filters.startDate || undefined,
      to_date: filters.endDate || undefined,
    }),
    [page, pageSize, filters],
  );

  // ── ADR-014: useQuery replaces useState + useEffect + manual fetch ────────
  const {
    data,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: [...taskKeys.lists(), queryParams],
    queryFn: () => {
      logger.info("useTaskSync: fetching tasks via useQuery", { queryParams });
      return taskIpc.list(queryParams);
    },
    enabled: autoFetch && !!userToken,
  });

  // ── Bridge effects: forward query state to legacy callbacks ───────────────

  useEffect(() => {
    callbacksRef.current.onLoadingChange?.(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (queryError) {
      const error =
        queryError instanceof Error
          ? queryError
          : new Error(String(queryError));
      logger.error("useTaskSync: query error", { error: error.message });
      callbacksRef.current.onError?.(error);
    } else {
      callbacksRef.current.onError?.(null);
    }
  }, [queryError]);

  useEffect(() => {
    if (data) {
      const tasks = (data.data as TaskWithDetails[]) ?? [];
      const pagination: TaskPagination = {
        page: data.pagination.page,
        total: Number(data.pagination.total),
        totalPages: data.pagination.total_pages,
        limit: data.pagination.limit,
      };
      logger.info("useTaskSync: tasks loaded", {
        taskCount: tasks.length,
        total: pagination.total,
        page: pagination.page,
      });
      callbacksRef.current.onTasksLoaded?.(tasks, pagination);
    }
  }, [data]);

  // ── Public API (same return shape for backward compatibility) ──────────────

  const fetchTasks = useCallback(
    async (requestedPage = 1, _newFilters = filters) => {
      setPage(requestedPage);
      // useQuery will auto-refetch when the page key changes
      return null;
    },
    [filters],
  );

  const refetch = useCallback(async () => {
    setPage(1);
    await queryRefetch();
    return null;
  }, [queryRefetch]);

  const goToPage = useCallback(async (newPage: number) => {
    setPage(newPage);
    // useQuery will auto-refetch when the page key changes
    return null;
  }, []);

  return {
    fetchTasks,
    refetch,
    goToPage,
  };
}
