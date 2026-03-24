import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipcClient } from "@/lib/ipc";
import { dashboardKeys } from "@/lib/query-keys";

export interface EntityCounts {
  tasks: number;
  clients: number;
  interventions: number;
}

export interface UseEntityCountsReturn {
  counts: EntityCounts | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEntityCounts(): UseEntityCountsReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: dashboardKeys.entityCounts(),
    queryFn: async () => {
      const response = await ipcClient.entityCounts.getCounts();
      return {
        tasks: response.tasks ?? 0,
        clients: response.clients ?? 0,
        interventions: response.interventions ?? 0,
      } satisfies EntityCounts;
    },
    staleTime: 60_000,
    retry: 2,
  });

  const handleRefetch = async () => {
    await queryClient.invalidateQueries({
      queryKey: dashboardKeys.entityCounts(),
    });
  };

  return {
    counts: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: handleRefetch,
  };
}
