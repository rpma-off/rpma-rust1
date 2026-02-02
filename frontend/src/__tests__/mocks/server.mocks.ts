import 'whatwg-fetch';
import { server } from 'mock-server';
import { rest } from 'msw';
import type { Task, Client, Intervention } from '@/lib/backend';

// Mock data factories
export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  task_number: 'TASK-001',
  title: 'Test Task',
  description: 'Test Description',
  status: 'pending',
  priority: 'medium',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  scheduled_date: '2024-01-02T00:00:00Z',
  vehicle_plate: 'TEST-123',
  vehicle_model: 'Test Model',
  vehicle_make: 'Test Make',
  vehicle_year: '2024',
  vin: '1HGCM82633A004352',
  client_id: 'client-1',
  technician_id: 'tech-1',
  ppf_zones: ['hood', 'fenders'],
  estimated_duration: 120,
  ...overrides,
});

export const createMockClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'client-1',
  name: 'Test Client',
  email: 'test@example.com',
  phone: '+1234567890',
  customer_type: 'individual',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockIntervention = (overrides: Partial<Intervention> = {}): Intervention => ({
  id: 'intervention-1',
  task_id: 'task-1',
  status: 'pending',
  current_step_id: 'step-1',
  completion_percentage: 0,
  started_at: null,
  completed_at: null,
  paused_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'tech-1',
  updated_by: 'tech-1',
  synced: false,
  last_synced_at: null,
  sync_error: null,
  metadata: null,
  notes: null,
  ...overrides,
});

// Mock server handlers
export const handlers = [
  // Task endpoints
  rest.get('/api/tasks', (req, res, ctx) => {
    const { page = 1, limit = 20 } = req.url.searchParams;
    const tasks = Array.from({ length: limit }, (_, i) => 
      createMockTask({ id: `task-${i + 1}` })
    );
    
    return res(
      ctx.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page: Number(page),
            limit,
            total: 100,
            total_pages: 5,
          },
        },
      }),
      { status: 200 }
    );
  }),

  rest.get('/api/tasks/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    return res(
      ctx.json({
        success: true,
        data: createMockTask({ id }),
      }),
      { status: 200 }
    );
  }),

  rest.post('/api/tasks', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: createMockTask(req.body as Partial<Task>),
      }),
      { status: 201 }
    );
  }),

  // Client endpoints
  rest.get('/api/clients', (req, res, ctx) => {
    const clients = Array.from({ length: 10 }, (_, i) => 
      createMockClient({ id: `client-${i + 1}` })
    );
    
    return res(
      ctx.json({
        success: true,
        data: clients,
      }),
      { status: 200 }
    );
  }),

  rest.get('/api/clients/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    return res(
      ctx.json({
        success: true,
        data: createMockClient({ id }),
      }),
      { status: 200 }
    );
  }),

  // Intervention endpoints
  rest.get('/api/interventions/:taskId', (req, res, ctx) => {
    const { taskId } = req.params;
    const interventions = Array.from({ length: 3 }, (_, i) => 
      createMockIntervention({ 
        id: `intervention-${i + 1}`,
        task_id: taskId,
        status: i === 0 ? 'in_progress' : 'pending'
      })
    );
    
    return res(
      ctx.json({
        success: true,
        data: interventions,
      }),
      { status: 200 }
    );
  }),

  // Sync status endpoint
  rest.get('/api/sync/status', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          status: 'connected',
          lastSync: new Date().toISOString(),
          pendingOperations: 0,
        },
      }),
      { status: 200 }
    );
  }),

  // Error simulation endpoints
  rest.get('/api/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Simulated error for testing',
        },
      })
    );
  }),

  rest.post('/api/network-error', (req, res, ctx) => {
    return res.networkError('Network error simulation');
  }),
];

// Setup server for tests
export const setupMockServer = () => {
  server.listen({
    onUnhandledRequest: (req, res) => {
      console.error(
        'Found an unhandled %s request to %s',
        req.method,
        req.url.toString()
      );
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ message: 'Not Found', status: 404 })
      );
    },
  });
};

export const stopMockServer = () => {
  server.close();
};