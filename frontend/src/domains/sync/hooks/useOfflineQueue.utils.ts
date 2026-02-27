type QueueOperationLike = {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
};

type QueueStatsLike = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  lastSyncAt?: Date;
};

export function computeQueueStats(operations: QueueOperationLike[]): QueueStatsLike {
  return operations.reduce(
    (acc, op) => ({
      total: acc.total + 1,
      pending: acc.pending + (op.status === 'pending' ? 1 : 0),
      processing: acc.processing + (op.status === 'processing' ? 1 : 0),
      completed: acc.completed + (op.status === 'completed' ? 1 : 0),
      failed: acc.failed + (op.status === 'failed' ? 1 : 0),
      lastSyncAt: acc.lastSyncAt
    }),
    { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 } as QueueStatsLike
  );
}

export function loadPersistedQueue<T>(storageKey: string): T[] {
  const savedQueue = localStorage.getItem(storageKey);
  if (!savedQueue) return [];
  return JSON.parse(savedQueue) as T[];
}

export function persistQueue<T>(storageKey: string, operations: T[]): void {
  if (operations.length > 0) {
    localStorage.setItem(storageKey, JSON.stringify(operations));
  } else {
    localStorage.removeItem(storageKey);
  }
}
