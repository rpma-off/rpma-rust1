export * from '@/lib/utils';
export * from '@/lib/utils/task-display';
export * from '@/lib/utils/timestamp-conversion';
export * from '@/lib/utils/error-handler';
export * from '@/lib/enhanced-toast';
export * from '@/lib/types';

export { logger, createLogger, LogContext, LogLevel } from '@/lib/logger';
export { logger as structuredLogger } from '@/lib/logging';
export {
  LogDomain,
  LogLayer,
  LogSeverity,
  CorrelationContext,
  CorrelationIdGenerator,
} from '@/lib/logging/types';

export { ipcClient, safeInvoke, IPC_COMMANDS, settingsOperations } from '@/lib/ipc';
export { reportsService } from '@/lib/services/entities/reports.service';
export { clientService } from '@/lib/services/entities/client.service';

export {
  getStatusLabel,
  taskStatusLabels,
  taskPriorityLabels,
  userRoleLabels,
  workflowExecutionStatusLabels,
  stepStatusLabels,
  ppfZoneLabels,
} from '@/lib/i18n/status-labels';
