import { notificationApi } from '@/lib/ipc/notification';
import type { Notification } from '@/lib/backend/notifications';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  entityUrl: string;
  correlationId?: string | null;
}): Promise<Notification | null> {
  try {
    const notification = await notificationApi.create({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_url: params.entityUrl,
      correlation_id: params.correlationId || null,
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export const NotificationType = {
  TASK_ASSIGNED: 'TaskAssignment',
  TASK_UPDATED: 'TaskUpdate',
  TASK_COMPLETED: 'TaskCompletion',
  TASK_OVERDUE: 'OverdueWarning',
  INTERVENTION_CREATED: 'InterventionCreated',
  INTERVENTION_UPDATED: 'InterventionUpdated',
  INTERVENTION_COMPLETED: 'InterventionCompleted',
  QUOTE_CREATED: 'QuoteCreated',
  QUOTE_APPROVED: 'QuoteApproved',
  QUOTE_REJECTED: 'QuoteRejected',
  CLIENT_CREATED: 'ClientCreated',
  CLIENT_UPDATED: 'ClientUpdated',
  SYSTEM_ALERT: 'SystemAlert',
} as const;

export const EntityType = {
  TASK: 'task',
  INTERVENTION: 'intervention',
  QUOTE: 'quote',
  CLIENT: 'client',
} as const;

export function buildEntityUrl(entityType: string, entityId: string): string {
  switch (entityType) {
    case EntityType.TASK:
      return `/tasks/${entityId}`;
    case EntityType.INTERVENTION:
      return `/interventions/${entityId}`;
    case EntityType.QUOTE:
      return `/quotes/${entityId}`;
    case EntityType.CLIENT:
      return `/clients/${entityId}`;
    default:
      return '/';
  }
}
