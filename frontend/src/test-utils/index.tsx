import { render, RenderOptions, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import { mockIPC } from '@tauri-apps/api/mocks';

// Default mock implementations
const defaultMocks = {
  // Auth mocks
  'get_session': () => Promise.resolve({
    success: true,
    data: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        username: 'testuser',
        role: 'User',
        is_active: true,
      },
      token: 'test-token',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
  }),

  // Common CRUD mocks
  'get_tasks': () => Promise.resolve({
    success: true,
    data: [],
  }),
  'get_clients': () => Promise.resolve({
    success: true,
    data: [],
  }),
  'get_interventions': () => Promise.resolve({
    success: true,
    data: [],
  }),
  'get_inventory_items': () => Promise.resolve({
    success: true,
    data: [],
  }),
};

// Type for custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  mocks?: Record<string, (args?: unknown) => Promise<unknown>>;
}

// Helper function to render components with all necessary providers
export const renderWithProviders = (
  ui: React.ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    mocks = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  // Setup IPC mocks
  const allMocks: Record<string, (args?: unknown) => Promise<unknown>> = { ...defaultMocks, ...mocks };
  mockIPC((cmd, args) => {
    const mock = allMocks[cmd];
    if (mock) {
      return mock(args);
    }
    console.warn(`No mock implementation for IPC command: ${cmd}`);
    return Promise.reject(new Error(`No mock for ${cmd}`));
  });

  // Wrapper component with all providers
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

// Helper for testing loading states
export const createLoadingMock = (command: string, delay = 100) => {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((r) => {
    resolve = r;
  });

  setTimeout(() => {
    resolve({ success: true, data: [] });
  }, delay);

  return {
    [command]: () => promise,
  };
};

// Helper for testing error states
export const createErrorMock = (command: string, errorMessage: string) => ({
  [command]: () => Promise.reject(new Error(errorMessage)),
});

// Helper for creating test data
export const createTestTask = (overrides = {}) => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'Pending',
  priority: 'Normal',
  client_id: 'client-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestClient = (overrides = {}) => ({
  id: 'client-1',
  name: 'Test Client',
  email: 'client@test.com',
  phone: '555-0123',
  address: '123 Test St',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestIntervention = (overrides = {}) => ({
  id: 'intervention-1',
  task_id: 'task-1',
  technician_id: 'tech-1',
  status: 'In Progress',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestInventoryItem = (overrides = {}) => ({
  id: 'item-1',
  material_id: 'material-1',
  material_name: 'Test Material',
  quantity_on_hand: 100,
  quantity_available: 100,
  unit_of_measure: 'm2',
  unit_cost: 50.0,
  ...overrides,
});

// Helper for waiting for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to mock user permissions
export const mockUserPermissions = (role: string = 'User') => {
  const sessionResponse = {
    success: true,
    data: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        username: 'testuser',
        role,
        is_active: true,
        permissions: role === 'Admin'
          ? ['read:all', 'write:all', 'delete:all']
          : ['read:own', 'write:own'],
      },
      token: 'test-token',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
  };

  mockIPC((cmd, args) => {
    if (cmd === 'get_session') {
      return Promise.resolve(sessionResponse);
    }
    const mock = defaultMocks[cmd];
    if (mock) {
      return mock(args);
    }
    return Promise.reject(new Error(`No mock for ${cmd}`));
  });
};

// Helper for testing form validation
export const testFormValidation = async (
  renderResult: ReturnType<typeof renderWithProviders>,
  fieldName: string,
  invalidValue: string,
  expectedError: string
) => {
  const { getByLabelText, getByText } = renderResult;

  // Find the input field
  const input = getByLabelText(new RegExp(fieldName, 'i'));
  
  // Enter invalid value
  // Note: You might need to adjust this based on your component structure
  await userEvent.type(input, invalidValue);
  
  // Check for validation error
  await waitFor(() => {
    expect(getByText(new RegExp(expectedError, 'i'))).toBeInTheDocument();
  });
};

// Helper for testing table sorting
export const testTableSorting = async (
  renderResult: ReturnType<typeof renderWithProviders>,
  columnName: string,
  initialData: unknown[]
) => {
  const { getByText, rerender } = renderResult;
  void initialData;
  void rerender;
  
  // Click column header to sort
  const header = getByText(new RegExp(columnName, 'i'));
  fireEvent.click(header);
  
  // Wait for re-render
  await waitForAsync();
  
  // You would need to verify the data is sorted here
  // This depends on your specific implementation
};

// Export all helpers for easy importing
export * from '@testing-library/react';
export { userEvent };
export { fireEvent, waitFor };
