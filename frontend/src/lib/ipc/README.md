# IPC Client Library

A comprehensive IPC client for Tauri frontend-backend communication with caching, retry logic, and observability features.

## Quick Start

```typescript
import { ipcClient } from '@/lib/ipc';

// Authenticate user
const session = await ipcClient.auth.login('user@example.com', 'password');

// Get a task with caching
const task = await ipcClient.tasks.get('task-123', session.token);

// Create a new task (invalidates cache)
const newTask = await ipcClient.tasks.create(taskData, session.token);
```

## Architecture Overview

```
Frontend (React)          IPC Layer               Backend (Rust)
    │                        │                        │
    ├── Components           ├── ipcClient             ├── Commands
    │   └── useIpcClient()   │   ├── safeInvoke()      │   └── task_crud
    │                        │   ├── cachedInvoke()    │
    │                        │   ├── withRetry()       │
    │                        │   └── recordMetric()    │
    │                        │
    └── Caching Layer        └── Metrics Layer
        └── TTL-based cache       └── Circular buffer
```

### Core Components

- **`ipcClient`**: Main client with domain-organized methods
- **`safeInvoke()`**: Base IPC wrapper with error handling and metrics
- **`cachedInvoke()`**: Cached version of safeInvoke for read operations
- **`withRetry()`**: Retry wrapper with exponential backoff
- **Metrics system**: Tracks performance and success rates

## Migration Guide

### Before (Legacy)
```typescript
// Direct Tauri invoke
import { invoke } from '@tauri-apps/api/tauri';
const result = await invoke('task_crud', { action: {...}, token });

// Old IpcService (deprecated)
import { IpcService } from '@/lib/tauri/ipc';
const task = await IpcService.getTask(id, token);
```

### After (New)
```typescript
// Use ipcClient
import { ipcClient } from '@/lib/ipc';
const task = await ipcClient.tasks.get(id, token);

// With retry for critical operations
import { withRetry } from '@/lib/ipc';
const result = await withRetry(() => ipcClient.tasks.get(id, token));
```

## Available Domains and Methods

### Auth
```typescript
ipcClient.auth.login(email, password)
ipcClient.auth.createAccount(request)
ipcClient.auth.refreshToken(token)
ipcClient.auth.logout(token)
ipcClient.auth.validateSession(token) // Cached: 30s
```

### Tasks
```typescript
ipcClient.tasks.create(data, token)
ipcClient.tasks.get(id, token) // Cached: 60s
ipcClient.tasks.update(id, data, token)
ipcClient.tasks.list(filters, token)
ipcClient.tasks.delete(id, token)
ipcClient.tasks.statistics(token)
```

### Clients
```typescript
ipcClient.clients.create(data, token)
ipcClient.clients.get(id, token) // Cached: 60s
ipcClient.clients.search(query, limit, token)
ipcClient.clients.list(filters, token)
ipcClient.clients.stats(token)
```

### Sync
```typescript
ipcClient.sync.start()
ipcClient.sync.stop()
ipcClient.sync.getStatus() // Cached: 5s
ipcClient.sync.syncNow()
ipcClient.sync.getOperationsForEntity(id, type)
```

### System
```typescript
ipcClient.system.healthCheck()
ipcClient.system.getStats()
ipcClient.system.getDeviceInfo()
```

### UI
```typescript
ipcClient.ui.windowMinimize()
ipcClient.ui.navigate(path, options)
ipcClient.ui.shellOpen(url)
```

## Caching Behavior

### Automatic Caching
Read operations are automatically cached with TTL:

- **Tasks**: `task:{id}` (60s)
- **Clients**: `client:{id}` (60s)
- **Auth Sessions**: `auth:session:{token}` (30s)
- **Sync Status**: `sync:status` (5s)

### Cache Invalidation
Write operations automatically invalidate related caches:

```typescript
// Creating a task invalidates all task caches
await ipcClient.tasks.create(data, token); // Clears 'task:*' keys

// Updating invalidates specific and list caches
await ipcClient.tasks.update(id, data, token); // Clears 'task:*' keys
```

### Manual Cache Control
```typescript
import { invalidateKey, clearCache, invalidatePattern, getCacheStats } from '@/lib/ipc';

// Invalidate specific key
invalidateKey('task:123');

// Invalidate by pattern
invalidatePattern('task:');

// Clear all cache
clearCache();

// Get cache statistics
const stats = getCacheStats(); // { hits, misses, sets, invalidations }
```

## Metrics and Observability

### Accessing Metrics
```typescript
import { getMetricsSummary, getCommandMetrics, logMetrics } from '@/lib/ipc';

// Get overall metrics
const summary = getMetricsSummary();
// {
//   totalCalls: 150,
//   successRate: 0.95,
//   averageDuration: 45.2,
//   commands: [...]
// }

// Get metrics for specific command
const taskMetrics = getCommandMetrics('task_crud');
// {
//   command: 'task_crud',
//   totalCalls: 50,
//   successRate: 0.98,
//   averageDuration: 32.1,
//   p95Duration: 78.5,
//   ...
// }

// Log metrics to console
logMetrics();
```

### Metrics Dashboard
For admin users, metrics are available in the admin dashboard component.

## Retry Logic

### Automatic Retry
For transient failures, wrap critical operations:

```typescript
import { withRetry } from '@/lib/ipc';

// Retry with default config (3 attempts, exponential backoff)
const result = await withRetry(() =>
  ipcClient.tasks.get(id, token)
);

// Custom retry config
const result = await withRetry(
  () => ipcClient.sync.syncNow(),
  { maxRetries: 5, baseDelay: 2000 }
);
```

### Retryable vs Non-Retryable Errors
- **Retryable**: Network errors, timeouts, 5xx status codes
- **Non-Retryable**: Authentication errors (401/403), validation errors (400)

## Testing Guide

### Mock Setup
```typescript
import { mockIpcClient, resetIpcMocks, mockTaskOperations } from '@/__tests__/mocks/ipcClient.mock';

// Mock the IPC client
vi.mock('@/lib/ipc', () => ({
  ipcClient: mockIpcClient,
  useIpcClient: () => mockIpcClient
}));

describe('MyComponent', () => {
  beforeEach(() => {
    resetIpcMocks();
  });

  it('loads tasks', async () => {
    // Mock successful response
    mockTaskOperations({
      get: vi.fn().mockResolvedValue(mockTask)
    });

    render(<TaskComponent />);
    // ... test assertions
  });

  it('handles errors', async () => {
    // Mock error response
    mockTaskOperations({
      get: vi.fn().mockRejectedValue(new Error('Network error'))
    });

    render(<TaskComponent />);
    // ... test error handling
  });
});
```

### Testing with Real IPC
For integration tests, use the real IPC client but mock Tauri:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

// Setup mock responses
const mockInvoke = vi.mocked(invoke);
mockInvoke.mockResolvedValue({ success: true, data: mockTask });
```

## Common Patterns

### Error Handling
```typescript
try {
  const task = await ipcClient.tasks.get(id, token);
  // Handle success
} catch (error) {
  if (error.message.includes('401')) {
    // Redirect to login
    navigate('/login');
  } else {
    // Show generic error
    showError('Failed to load task');
  }
}
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const loadTask = async () => {
  setLoading(true);
  try {
    const task = await ipcClient.tasks.get(id, token);
    setTask(task);
  } finally {
    setLoading(false);
  }
};
```

### Optimistic Updates
```typescript
const updateTask = async (id, updates) => {
  // Optimistic update
  setTasks(prev => prev.map(t => t.id === id ? {...t, ...updates} : t));

  try {
    await ipcClient.tasks.update(id, updates, token);
  } catch (error) {
    // Revert on error
    setTasks(prev);
    showError('Update failed');
  }
};
```

## Anti-Patterns

### ❌ Don't call IPC in render
```typescript
// Bad: IPC call in component body
function TaskList() {
  const tasks = await ipcClient.tasks.list({}, token); // ❌
  return <div>...</div>;
}

// Good: Use useEffect or event handlers
function TaskList() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    ipcClient.tasks.list({}, token).then(setTasks);
  }, []);
}
```

### ❌ Don't ignore errors
```typescript
// Bad: Silent failures
await ipcClient.tasks.delete(id, token); // ❌

// Good: Handle errors
try {
  await ipcClient.tasks.delete(id, token);
  showSuccess('Task deleted');
} catch (error) {
  showError('Delete failed');
}
```

### ❌ Don't overuse caching
```typescript
// Bad: Caching volatile data
cachedInvoke('volatile:key', 'get_volatile_data', {}, undefined, 3600000); // ❌ 1 hour

// Good: Appropriate TTL for data freshness
cachedInvoke('stable:key', 'get_stable_data', {}, undefined, 300000); // ✅ 5 minutes
```

## Performance Tips

1. **Use caching** for frequently accessed read data
2. **Batch operations** when possible
3. **Implement retry** for critical operations
4. **Monitor metrics** to identify bottlenecks
5. **Clear cache** after data mutations

## Troubleshooting

### Cache Issues
- Check cache stats: `getCacheStats()`
- Manually clear: `clearCache()`
- Verify TTL values

### Metrics Not Recording
- Ensure `safeInvoke` is used (not direct `invoke`)
- Check console for errors during metric recording

### Retry Not Working
- Verify error is retryable: `isRetryableError(error)`
- Check retry config parameters

## Future Enhancements

- [ ] Request deduplication
- [ ] Background sync for offline support
- [ ] Advanced analytics integration
- [ ] Request batching
- [ ] Circuit breaker pattern