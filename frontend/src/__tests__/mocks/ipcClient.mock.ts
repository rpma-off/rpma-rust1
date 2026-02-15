// Jest mock

// Mock implementation matching ipcClient structure
export const mockIpcClient = {
  auth: {
    login: jest.fn(),
    createAccount: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateSession: jest.fn(),
  },
  tasks: {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    statistics: jest.fn(),
  },
  clients: {
    create: jest.fn(),
    get: jest.fn(),
    search: jest.fn(),
    list: jest.fn(),
    stats: jest.fn(),
  },
  photos: {
    list: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
  },
  interventions: {
    start: jest.fn(),
    advanceStep: jest.fn(),
    getStep: jest.fn(),
    updateWorkflow: jest.fn(),
  },
  notifications: {
    initialize: jest.fn(),
    send: jest.fn(),
    testConfig: jest.fn(),
    getStatus: jest.fn(),
  },
  settings: {
    getAppSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
  },
  dashboard: {
    getStats: jest.fn(),
  },
  users: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  sync: {
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn(),
    syncNow: jest.fn(),
    getOperationsForEntity: jest.fn(),
  },
  system: {
    healthCheck: jest.fn(),
    getStats: jest.fn(),
    getDeviceInfo: jest.fn(),
  },
  ui: {
    windowMinimize: jest.fn(),
    windowMaximize: jest.fn(),
    windowClose: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    getCurrent: jest.fn(),
    addToHistory: jest.fn(),
    registerShortcuts: jest.fn(),
    shellOpen: jest.fn(),
    gpsGetCurrentPosition: jest.fn(),
  },
};

/**
 * Reset all IPC client mocks
 */
export function resetIpcMocks(): void {
  Object.values(mockIpcClient).forEach(domain => {
    if (typeof domain === 'object' && domain !== null) {
      Object.values(domain).forEach(method => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.MockedFunction<(...args: unknown[]) => unknown>).mockReset();
        }
      });
    }
  });
}

/**
 * Mock task operations with optional overrides
 */
export function mockTaskOperations(overrides?: Partial<typeof mockIpcClient.tasks>): void {
  if (overrides) {
    Object.assign(mockIpcClient.tasks, overrides);
  }
}

/**
 * Mock client operations with optional overrides
 */
export function mockClientOperations(overrides?: Partial<typeof mockIpcClient.clients>): void {
  if (overrides) {
    Object.assign(mockIpcClient.clients, overrides);
  }
}

/**
 * Mock auth operations with optional overrides
 */
export function mockAuthOperations(overrides?: Partial<typeof mockIpcClient.auth>): void {
  if (overrides) {
    Object.assign(mockIpcClient.auth, overrides);
  }
}

/**
 * Setup mock IPC client for testing
 * Usage: vi.mock('@/lib/ipc', () => ({ ipcClient: mockIpcClient, useIpcClient: () => mockIpcClient }));
 */
export function setupIpcMock(): void {
  // This function can be called in test setup to configure mocks
}