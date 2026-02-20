import { useState, useCallback, useEffect, useRef } from 'react';
import { createPermissionChecker, Permission } from '@/lib/rbac';
import type { UserAccount } from '@/lib/backend';
import { displayError, displaySuccess, displayInfo, createError } from '@/lib/utils/errorHandling';
import { ErrorCategory, ErrorSeverity } from '@/lib/utils/errorHandling';

// Queue operation types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  UPLOAD_PHOTO = 'upload_photo',
  UPDATE_STATUS = 'update_status',
  ADD_NOTE = 'add_note',
  START_INTERVENTION = 'start_intervention',
  ADVANCE_STEP = 'advance_step',
  COMPLETE_STEP = 'complete_step',
  FINALIZE_INTERVENTION = 'finalize_intervention',
}

export enum OperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface QueueOperation {
  id: string;
  type: OperationType;
  entityType: 'task' | 'client' | 'intervention' | 'photo';
  entityId: string;
  data: Record<string, unknown>;
  status: OperationStatus;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
  priority: number; // Higher number = higher priority
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  lastSyncAt?: Date;
}

export interface OfflineQueueOptions {
  batchSize?: number;
  retryDelay?: number;
  maxRetries?: number;
  autoProcess?: boolean;
}

export const useOfflineQueue = (
  user: Record<string, unknown> | null,
  options: OfflineQueueOptions = {}
) => {
  const {
    batchSize = 10,
    retryDelay = 1000,
    maxRetries = 3,
    autoProcess = true,
  } = options;

  const [queue, setQueue] = useState<QueueOperation[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  const permissionChecker = createPermissionChecker(user as UserAccount | null);
  const processingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load persisted queue on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('offline-queue');
    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        setQueue(parsedQueue);
        updateStats(parsedQueue);
      } catch (_error) {
        displayError('Failed to load offline queue');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem('offline-queue', JSON.stringify(queue));
    } else {
      localStorage.removeItem('offline-queue');
    }
  }, [queue]);

  // Update stats when queue changes
  const updateStats = useCallback((operations: QueueOperation[]) => {
    const newStats = operations.reduce(
      (acc, op) => ({
        total: acc.total + 1,
        pending: acc.pending + (op.status === OperationStatus.PENDING ? 1 : 0),
        processing: acc.processing + (op.status === OperationStatus.PROCESSING ? 1 : 0),
        completed: acc.completed + (op.status === OperationStatus.COMPLETED ? 1 : 0),
        failed: acc.failed + (op.status === OperationStatus.FAILED ? 1 : 0),
      }),
      { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 }
    );
    
    setStats(newStats);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoProcess && queue.length > 0) {
        processBatch();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Cancel any ongoing processing when going offline
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      setIsProcessing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, autoProcess]);

  // Add operation to queue
  const addToQueue = useCallback((
    type: OperationType,
    entityType: QueueOperation['entityType'],
    entityId: string,
    data: Record<string, unknown>,
    priority: number = 0
  ) => {
    const operation: QueueOperation = {
      id: `${type}-${entityId}-${Date.now()}`,
      type,
      entityType,
      entityId,
      data,
      status: OperationStatus.PENDING,
      retries: 0,
      maxRetries,
      createdAt: new Date(),
      priority,
    };

    setQueue(prev => {
      const newQueue = [...prev, operation].sort((a, b) => b.priority - a.priority);
      updateStats(newQueue);
      return newQueue;
    });

    // Show toast for offline queue addition
    if (!isOnline) {
      displaySuccess('Operation queued for sync', `Will sync when connection is restored`);
    }
  }, [isOnline, maxRetries, updateStats]);

  // Process batch of operations
  const processBatch = useCallback(async () => {
    if (isProcessing || queue.length === 0 || !isOnline) {
      return;
    }

    setIsProcessing(true);
    
    const pendingOperations = queue.filter(op => op.status === OperationStatus.PENDING);
    const batchToProcess = pendingOperations.slice(0, batchSize);

    try {
      for (const operation of batchToProcess) {
        // Update status to processing
        setQueue(prev => 
          prev.map(op => 
            op.id === operation.id 
              ? { ...op, status: OperationStatus.PROCESSING, lastAttemptAt: new Date() }
              : op
          )
        );

        try {
          await processOperation(operation);
          
          // Mark as completed
          setQueue(prev => 
            prev.map(op => 
              op.id === operation.id 
                ? { ...op, status: OperationStatus.COMPLETED }
                : op
            )
          );
        } catch (error) {
          // Mark as failed and prepare for retry
          setQueue(prev => 
            prev.map(op => 
              op.id === operation.id 
                ? { 
                    ...op, 
                    status: OperationStatus.FAILED,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    retries: op.retries + 1
                  }
                : op
            )
          );
        }
      }

      displaySuccess(`Processed ${batchToProcess.length} operations`);
    } catch (error) {
      const appError = createError('Batch processing failed', ErrorCategory.UNKNOWN, ErrorSeverity.HIGH, {
        details: { message: error instanceof Error ? error.message : String(error) },
      });
      displayError(appError);
    } finally {
      setIsProcessing(false);
      setStats(prev => ({ ...prev, lastSyncAt: new Date() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, queue, batchSize]);

  // Process individual operation
  const processOperation = useCallback(async (operation: QueueOperation) => {
    const { can: hasPermission } = permissionChecker;
    // Check permissions
    const permissionMap: Record<OperationType, Permission> = {
      [OperationType.CREATE]: 'task:write',
      [OperationType.UPDATE]: 'task:update',
      [OperationType.DELETE]: 'task:delete',
      [OperationType.UPLOAD_PHOTO]: 'photo:upload',
      [OperationType.UPDATE_STATUS]: 'task:update',
      [OperationType.ADD_NOTE]: 'task:write',
      [OperationType.START_INTERVENTION]: 'task:write',
      [OperationType.ADVANCE_STEP]: 'task:write',
      [OperationType.COMPLETE_STEP]: 'task:write',
      [OperationType.FINALIZE_INTERVENTION]: 'task:write',
    };

    const requiredPermission = permissionMap[operation.type];
    if (!hasPermission(requiredPermission)) {
      throw new Error(`Insufficient permissions for ${operation.type}`);
    }

    // Simulate API call (replace with actual IPC call)
    await simulateApiCall(operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionChecker]);

  // Simulate API call (replace with actual implementation)
  const simulateApiCall = useCallback(async (_operation: QueueOperation): Promise<void> => {
    // Add delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Randomly fail for testing
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Simulated network error');
    }
    
    // Success
  }, []);

  // Retry failed operations
  const retryFailedOperations = useCallback(() => {
    const failedOperations = queue.filter(
      op => op.status === OperationStatus.FAILED && op.retries < op.maxRetries
    );

    if (failedOperations.length === 0) {
      displayInfo('No operations to retry');
      return;
    }

    setQueue(prev => 
      prev.map(op => {
        const failedOp = failedOperations.find(f => f.id === op.id);
        if (failedOp) {
          return {
            ...op,
            status: OperationStatus.RETRYING,
            retries: op.retries + 1,
            lastAttemptAt: new Date(),
          };
        }
        return op;
      })
    );

    // Wait before processing retries
    setTimeout(() => {
      processBatch();
    }, retryDelay);

    displayInfo(`Retrying ${failedOperations.length} operations`);
  }, [queue, processBatch, retryDelay]);

  // Clear completed operations
  const clearCompleted = useCallback(() => {
    setQueue(prev => {
      const filtered = prev.filter(op => 
        op.status !== OperationStatus.COMPLETED
      );
      updateStats(filtered);
      return filtered;
    });
  }, [updateStats]);

  // Clear failed operations
  const clearFailed = useCallback(() => {
    setQueue(prev => {
      const filtered = prev.filter(op => 
        op.status !== OperationStatus.FAILED
      );
      updateStats(filtered);
      return filtered;
    });
  }, [updateStats]);

  // Export/Import queue for debugging
  const exportQueue = useCallback(() => {
    const dataStr = JSON.stringify(queue, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-queue-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [queue]);

  // Import queue from file
  const importQueue = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setQueue(imported);
        updateStats(imported);
        displaySuccess('Queue imported successfully');
      } catch (error) {
        displayError(createError('Failed to import queue', ErrorCategory.UNKNOWN, ErrorSeverity.HIGH, {
          details: { message: error instanceof Error ? error.message : String(error) },
        }));
      }
    };
    reader.readAsText(file);
  }, [updateStats]);

  return {
    queue,
    isOnline,
    isProcessing,
    stats,
    addToQueue,
    processBatch,
    retryFailedOperations,
    clearCompleted,
    clearFailed,
    exportQueue,
    importQueue,
  };
};
