/**
 * Deterministic test adapter for IPC.
 *
 * Returns preset responses without hitting the Tauri backend.
 * Designed for Jest / Vitest tests that need reliable, repeatable data.
 *
 * Usage:
 *   import { createTestAdapter } from '@/lib/ipc/test-adapter';
 *   const adapter = createTestAdapter();        // uses defaults
 *   const adapter = createTestAdapter(overrides); // merge custom fixtures
 */
import type { IpcAdapter } from './adapter';

/* ────────────────────────────────────────────────────────── */
/*  Default fixtures                                         */
/* ────────────────────────────────────────────────────────── */

export const TEST_SESSION = {
  user_id: 'user-test-1',
  token: 'test-session-token',
  role: 'admin' as const,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  expires_at: '2099-12-31T23:59:59Z',
};

export const TEST_TASK = {
  id: 'task-test-1',
  task_number: 'TASK-0001',
  title: 'Test PPF Task',
  description: 'Deterministic test task',
  vehicle_plate: 'TEST-001',
  vehicle_model: 'Model 3',
  vehicle_year: '2023',
  vehicle_make: 'Tesla',
  vin: '5YJ3E1EA1JF000001',
  ppf_zones: ['hood', 'fenders'],
  custom_ppf_zones: null,
  status: 'pending' as const,
  priority: 'medium' as const,
  technician_id: null,
  assigned_at: null,
  assigned_by: null,
  scheduled_date: '2026-06-01T09:00:00Z',
  start_time: null,
  end_time: null,
  date_rdv: null,
  heure_rdv: null,
  template_id: null,
  workflow_id: null,
  workflow_status: null,
  current_workflow_step_id: null,
  started_at: null,
  completed_at: null,
  completed_steps: null,
  client_id: 'client-test-1',
  customer_name: 'Client A',
  customer_email: 'clienta@test.com',
  customer_phone: '555-0001',
  customer_address: '123 Test St',
  external_id: null,
  lot_film: null,
  checklist_completed: false,
  notes: null,
  tags: null,
  estimated_duration: 4,
  actual_duration: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  creator_id: null,
  created_by: null,
  updated_by: null,
  deleted_at: null,
  deleted_by: null,
  synced: true,
  last_synced_at: '2026-01-01T00:00:00Z',
};

export const TEST_TASK_LIST = {
  tasks: [TEST_TASK],
  total: 1,
  page: 1,
  per_page: 20,
};

export const TEST_TASK_STATISTICS = {
  total: 10,
  pending: 3,
  in_progress: 4,
  completed: 3,
  overdue: 0,
};

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                   */
/* ────────────────────────────────────────────────────────── */

/** Create a rejected promise with a structured IPC error. */
function ipcError(code: string, message: string): Promise<never> {
  const err = Object.assign(new Error(message), { code });
  return Promise.reject(err);
}

const noop = () => Promise.resolve(undefined as never);

/* ────────────────────────────────────────────────────────── */
/*  Factory                                                   */
/* ────────────────────────────────────────────────────────── */

export type TestAdapterOverrides = {
  [K in keyof IpcAdapter]?: Partial<IpcAdapter[K]>;
};

/**
 * Build a fully-typed IPC adapter backed by in-memory fixtures.
 * Every method returns a resolved promise with deterministic data.
 */
export function createTestAdapter(overrides?: TestAdapterOverrides): IpcAdapter {
  const base: IpcAdapter = {
    auth: {
      login: (_email: string, _password: string) => Promise.resolve(TEST_SESSION as never),
      createAccount: () => Promise.resolve(TEST_SESSION as never),
      refreshToken: () => Promise.resolve(TEST_SESSION as never),
      logout: () => Promise.resolve(undefined as never),
      validateSession: () => Promise.resolve(TEST_SESSION as never),
      enable2FA: () => ipcError('NOT_IMPLEMENTED', '2FA not implemented'),
      verify2FASetup: () => ipcError('NOT_IMPLEMENTED', '2FA not implemented'),
      disable2FA: () => ipcError('NOT_IMPLEMENTED', '2FA not implemented'),
      regenerateBackupCodes: () => ipcError('NOT_IMPLEMENTED', '2FA not implemented'),
      is2FAEnabled: () => Promise.resolve(false as never),
    },
    tasks: {
      create: () => Promise.resolve(TEST_TASK as never),
      get: () => Promise.resolve(TEST_TASK as never),
      update: () => Promise.resolve(TEST_TASK as never),
      list: () => Promise.resolve(TEST_TASK_LIST as never),
      delete: () => Promise.resolve(undefined as never),
      statistics: () => Promise.resolve(TEST_TASK_STATISTICS as never),
      editTask: () => Promise.resolve(TEST_TASK as never),
      checkTaskAssignment: noop,
      checkTaskAvailability: noop,
      validateTaskAssignmentChange: noop,
      addTaskNote: noop,
      sendTaskMessage: noop,
      delayTask: noop,
      reportTaskIssue: noop,
      exportTasksCsv: () => Promise.resolve('' as never),
      importTasksBulk: noop,
    },
    clients: {
      create: noop,
      get: noop,
      getWithTasks: noop,
      search: () => Promise.resolve([] as never),
      list: () => Promise.resolve({ clients: [], total: 0, page: 1, per_page: 20 } as never),
      listWithTasks: () => Promise.resolve([] as never),
      stats: () => Promise.resolve({ total: 0, active: 0 } as never),
      update: noop,
      delete: noop,
    },
    intervention: {
      getActiveByTask: noop,
      saveStepProgress: noop,
      getStep: noop,
      getProgress: noop,
    },
    interventions: {
      start: noop,
      get: noop,
      getActiveByTask: noop,
      getLatestByTask: noop,
      advanceStep: noop,
      saveStepProgress: noop,
      getStep: noop,
      getProgress: noop,
      updateWorkflow: noop,
      finalize: noop,
      list: noop,
    },
    notifications: {
      initialize: noop,
      send: noop,
      testConfig: noop,
      getStatus: noop,
      getRecentActivities: noop,
    },
    settings: {
      getAppSettings: noop,
      updateNotificationSettings: noop,
      getUserSettings: noop,
      updateUserProfile: noop,
      updateUserPreferences: noop,
      updateUserSecurity: noop,
      updateUserPerformance: noop,
      updateUserAccessibility: noop,
      updateUserNotifications: noop,
      changeUserPassword: noop,
      getActiveSessions: noop,
      revokeSession: noop,
      revokeAllSessionsExceptCurrent: noop,
      updateSessionTimeout: noop,
      getSessionTimeoutConfig: noop,
      uploadUserAvatar: noop,
      exportUserData: noop,
      deleteUserAccount: noop,
      getDataConsent: noop,
      updateDataConsent: noop,
    },
    material: {
      list: () => Promise.resolve([] as never),
      create: noop,
      update: noop,
      get: noop,
      delete: noop,
      updateStock: noop,
      adjustStock: noop,
      recordConsumption: noop,
      getConsumptionHistory: noop,
      createInventoryTransaction: noop,
      getTransactionHistory: noop,
      createCategory: noop,
      listCategories: noop,
      createSupplier: noop,
      listSuppliers: noop,
      getStats: noop,
      getLowStockMaterials: () => Promise.resolve([] as never),
      getExpiredMaterials: () => Promise.resolve([] as never),
      getInventoryMovementSummary: noop,
    },
    calendar: {
      getEvents: noop,
      getEventById: noop,
      createEvent: noop,
      updateEvent: noop,
      deleteEvent: noop,
      getEventsForTechnician: noop,
      getEventsForTask: noop,
    },
    dashboard: {
      getStats: noop,
    },
    users: {
      create: noop,
      get: noop,
      list: noop,
      update: noop,
      delete: noop,
      changeRole: noop,
      updateEmail: noop,
      changePassword: noop,
      banUser: noop,
      unbanUser: noop,
    },
    bootstrap: {
      firstAdmin: noop,
      hasAdmins: () => Promise.resolve(true as never),
    },
    sync: {
      start: noop,
      stop: noop,
      getStatus: noop,
      syncNow: noop,
      getOperationsForEntity: noop,
    },
    performance: {
      getStats: noop,
      getMetrics: noop,
      cleanupMetrics: noop,
      getCacheStatistics: noop,
      clearApplicationCache: noop,
      configureCacheSettings: noop,
    },
    security: {
      getMetrics: noop,
      getEvents: noop,
      getAlerts: noop,
      acknowledgeAlert: noop,
      resolveAlert: noop,
      cleanupEvents: noop,
      getActiveSessions: noop,
      revokeSession: noop,
      revokeAllSessionsExceptCurrent: noop,
      updateSessionTimeout: noop,
      getSessionTimeoutConfig: noop,
    },
    system: {
      healthCheck: () => Promise.resolve({ status: 'ok' } as never),
      getDatabaseStatus: noop,
      getDatabaseStats: noop,
      getDatabasePoolStats: noop,
      getAppInfo: () => Promise.resolve({ version: '0.0.0-test' } as never),
      vacuumDatabase: noop,
    },
    ui: {
      windowMinimize: noop,
      windowMaximize: noop,
      windowClose: noop,
      navigate: noop,
      goBack: noop,
      goForward: noop,
      getCurrent: noop,
      addToHistory: noop,
      registerShortcuts: noop,
      shellOpen: noop,
      gpsGetCurrentPosition: noop,
      initiateCustomerCall: noop,
    },
  } as unknown as IpcAdapter;

  // Merge overrides
  if (overrides) {
    for (const domain of Object.keys(overrides) as (keyof IpcAdapter)[]) {
      const domainOverrides = overrides[domain];
      if (domainOverrides && typeof domainOverrides === 'object') {
        Object.assign(
          base[domain] as Record<string, unknown>,
          domainOverrides,
        );
      }
    }
  }

  return base;
}
