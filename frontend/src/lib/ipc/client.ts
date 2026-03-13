import './mock/init';
import { authIpc } from '@/domains/auth/ipc/auth.ipc';
import { taskIpc } from '@/domains/tasks/ipc/task.ipc';
import { clientIpc } from '@/domains/clients/ipc/client.ipc';
import { materialIpc } from '@/domains/inventory/ipc/material.ipc';
import { inventoryIpc } from '@/domains/inventory/ipc/inventory.ipc';
import { dashboardIpc } from '@/domains/dashboard/ipc/dashboard.ipc';
import { entityCountsIpc } from '@/domains/dashboard/ipc/entity-counts.ipc';
import { interventionsIpc } from '@/domains/interventions/ipc/interventions.ipc';
import { photosIpc } from '@/domains/interventions/ipc/photos.ipc';
import { ppfWorkflowIpc } from '@/domains/interventions/ipc/ppfWorkflow.ipc';
import { userIpc } from '@/domains/users/ipc/users.ipc';
import { settingsIpc } from '@/domains/settings/ipc/settings.ipc';
import { notificationsIpc } from '@/domains/notifications/ipc/notifications.ipc';
import { bootstrapIpc } from '@/domains/bootstrap/ipc/bootstrap.ipc';
import { calendarIpc } from '@/domains/calendar/ipc/calendar.ipc';
import { adminIpc } from '@/domains/admin/ipc/admin.ipc';
import { auditIpc } from '@/domains/admin/ipc/audit.ipc';
import { organizationIpc } from '@/domains/admin/ipc/organization.ipc';
import { securityIpc } from '@/domains/admin/ipc/security.ipc';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import { reportsIpc } from '@/domains/reports/ipc/reports.ipc';
import { systemOperations } from './domains/system';

// Re-export necessary types that might be used by consumers of ipcClient
// or used in the domain wrappers themselves.
export * from './types';

export const ipcClient = {
  auth: authIpc,
  tasks: taskIpc,
  clients: clientIpc,
  photos: photosIpc,
  interventions: interventionsIpc,
  // Alias or legacy support for single 'intervention'
  intervention: interventionsIpc,
  ppfWorkflow: ppfWorkflowIpc,
  notifications: notificationsIpc,
  settings: settingsIpc,
  organization: organizationIpc,
  security: securityIpc,
  dashboard: dashboardIpc,
  entityCounts: entityCountsIpc,
  users: userIpc,
  bootstrap: bootstrapIpc,
  admin: adminIpc,
  audit: auditIpc,
  calendar: calendarIpc,
  material: materialIpc,
  inventory: inventoryIpc,
  quotes: quotesIpc,
  reports: reportsIpc,
  system: systemOperations,
} as const;

export type IpcClient = typeof ipcClient;

// Type-safe hook
export function useIpcClient() {
  return ipcClient;
}
