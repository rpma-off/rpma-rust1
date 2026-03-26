import { useQuery } from "@tanstack/react-query";
import { useMutationCounter } from "@/lib/data-freshness";
import { clientKeys } from "@/lib/query-keys";
import type { Client } from "@/lib/backend";
import { clientIpc } from "../ipc";

/** Maximum results returned when the user has typed a search query. */
const SEARCH_RESULTS_LIMIT = 20;
/** Maximum results returned when browsing with no query (full dropdown list). */
const BROWSE_RESULTS_LIMIT = 100;

/**
 * Search clients by query string using TanStack Query.
 *
 * Replaces the manual useState + useEffect + useCallback fetch pattern
 * in ClientSelector (ADR-014: server state must go through TanStack Query).
 */
export function useClientSearch(query: string) {
  const mutations = useMutationCounter("clients");
  return useQuery<Client[]>({
    queryKey: [...clientKeys.list(), "search", query, mutations],
    queryFn: async () => {
      const result = await clientIpc.list({
        page: 1,
        limit: query.trim() ? SEARCH_RESULTS_LIMIT : BROWSE_RESULTS_LIMIT,
        search: query.trim() || undefined,
        sort_by: "name",
        sort_order: "asc",
      });
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch a single client by ID using TanStack Query.
 *
 * Used by ClientSelector to resolve a pre-selected ID that may not appear
 * in the current search results.
 */
export function useClientById(id: string | undefined) {
  return useQuery<Client | null>({
    queryKey: [...clientKeys.all, id],
    queryFn: () => (id ? clientIpc.get(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 60_000,
  });
}
