/**
 * Lightweight data freshness signaling for cross-navigation mutation tracking.
 *
 * When a mutation (create / update / delete) succeeds, call `signalMutation(entity)`.
 * List hooks subscribe via `useMutationCounter(entity)` which returns a reactive
 * counter that increments on every mutation, triggering a re-fetch via useEffect deps.
 *
 * This uses `useSyncExternalStore` so the subscription is safe for concurrent React
 * and works correctly even when a component is restored from the Next.js Router Cache.
 */

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Module-level store – persists across navigations within the same JS context
// ---------------------------------------------------------------------------

const counters: Record<string, number> = {};
const listeners = new Set<() => void>();
const DOMAIN_MUTATION_EVENT = 'domain-mutation';

function getMutationDomain(event: Event): string | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail = event.detail as { domain?: unknown } | null;
  return typeof detail?.domain === 'string' && detail.domain.length > 0
    ? detail.domain
    : null;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Record that a data mutation occurred for `entity` (e.g. "tasks", "clients", "quotes"). */
export function signalMutation(entity: string): void {
  counters[entity] = (counters[entity] || 0) + 1;
  listeners.forEach((cb) => cb());

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DOMAIN_MUTATION_EVENT, { detail: { domain: entity } }));
  }
}

/** Read the current mutation counter for `entity`. */
export function getMutationCounter(entity: string): number {
  return counters[entity] || 0;
}

/**
 * React hook that returns a reactive mutation counter for the given entity.
 *
 * The returned number increments every time `signalMutation(entity)` is called,
 * causing any useEffect that includes it in its dependency array to re-run.
 */
export function useMutationCounter(entity: string): number {
  return useSyncExternalStore(
    subscribe,
    () => getMutationCounter(entity),
    // Server snapshot is always 0 because this is an offline-first Tauri app —
    // mutations only happen on the client, so no server-side state exists.
    () => 0,
  );
}

export function useMutationSignal(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleMutation = (event: Event) => {
      const domain = getMutationDomain(event);

      if (domain) {
        void queryClient.invalidateQueries({ queryKey: [domain] });
      }
    };

    window.addEventListener(DOMAIN_MUTATION_EVENT, handleMutation as EventListener);
    return () => {
      window.removeEventListener(DOMAIN_MUTATION_EVENT, handleMutation as EventListener);
    };
  }, [queryClient]);
}

/** Reset all mutation counters. Useful for tests and development hot-reload cleanup. */
export function resetMutationCounters(): void {
  for (const key of Object.keys(counters)) {
    delete counters[key];
  }
  listeners.forEach((cb) => cb());
}
