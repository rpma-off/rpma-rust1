export * from '@/lib/utils';
export * from '@/lib/utils/timestamp-conversion';
export * from '@/lib/utils/error-handler';
export { convertNullsToUndefined } from '@/lib/utils/data-normalization';
export * from '@/lib/enhanced-toast';
export * from '@/lib/types';
// Note: Domain-specific utilities are now available from their respective domains

export { logger, createLogger, LogContext, LogLevel } from '@/lib/logger';
export { logger as structuredLogger } from '@/lib/logging';
export {
  LogDomain,
  LogLayer,
  LogSeverity,
  CorrelationContext,
  CorrelationIdGenerator,
} from '@/lib/logging/types';

export { ipcClient, settingsOperations } from '@/lib/ipc';

export {
  getStatusLabel,
  taskStatusLabels,
  taskPriorityLabels,
  userRoleLabels,
  workflowExecutionStatusLabels,
  stepStatusLabels,
  ppfZoneLabels,
} from '@/lib/i18n/status-labels';




