import { signalMutation } from '@/lib/data-freshness';
import { invalidatePattern } from '../core';

export interface MutationEffectConfig {
  invalidate?: readonly string[];
  signal?: readonly string[];
}

/**
 * Applies synchronous post-mutation side effects for successful IPC operations.
 *
 * Cache invalidation always runs before mutation signals so subscribers only
 * observe the domain event after local cache cleanup has completed.
 */
export function applyMutationEffects(config: MutationEffectConfig): void {
  for (const pattern of config.invalidate ?? []) {
    invalidatePattern(pattern);
  }

  for (const domain of config.signal ?? []) {
    signalMutation(domain);
  }
}

/**
 * Runs an async operation and applies mutation side effects only if it succeeds.
 *
 * If the wrapped operation rejects, the error is propagated unchanged and no
 * invalidation or mutation signaling is performed.
 */
export async function runWithMutationEffects<T>(
  operation: () => Promise<T>,
  config: MutationEffectConfig,
): Promise<T> {
  const result = await operation();
  applyMutationEffects(config);
  return result;
}
