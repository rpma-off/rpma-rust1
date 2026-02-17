import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PPFWorkflowProvider, usePPFWorkflow } from '../api/PPFWorkflowProvider';
import { interventionsIpc } from '../ipc/interventions.ipc';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    session: { token: 'session-token' },
  }),
}));

jest.mock('../ipc/interventions.ipc', () => ({
  interventionsIpc: {
    getActiveByTask: jest.fn(),
    getLatestByTask: jest.fn(),
    getProgress: jest.fn(),
    advanceStep: jest.fn(),
    saveStepProgress: jest.fn(),
    finalize: jest.fn(),
  },
}));

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    tasks: {
      get: jest.fn(),
    },
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const WorkflowConsumer = () => {
  const { taskId, steps, isLoading } = usePPFWorkflow();
  if (isLoading) {
    return <div>loading</div>;
  }
  return <div>{taskId}:{steps.length}</div>;
};

describe('PPFWorkflowProvider', () => {
  const mockInterventions = interventionsIpc as jest.Mocked<typeof interventionsIpc>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides workflow context to consumers', async () => {
    mockInterventions.getActiveByTask.mockResolvedValue({
      type: 'ActiveRetrieved',
      intervention: {
        id: 'intervention-1',
        status: 'active',
      },
    } as never);

    mockInterventions.getProgress.mockResolvedValue({ steps: [] } as never);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PPFWorkflowProvider taskId="task-123">
          <WorkflowConsumer />
        </PPFWorkflowProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('task-123:4')).toBeInTheDocument();
    });
  });
});
