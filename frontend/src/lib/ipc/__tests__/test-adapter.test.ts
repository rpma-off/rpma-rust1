/**
 * Tests for the deterministic test adapter.
 *
 * Validates that createTestAdapter returns an object matching the
 * IpcAdapter interface and that overrides are applied correctly.
 */
import {
  createTestAdapter,
  TEST_SESSION,
  TEST_TASK,
  TEST_TASK_LIST,
} from '../test-adapter';

describe('createTestAdapter', () => {
  it('returns an adapter with all top-level domains', () => {
    const adapter = createTestAdapter();
    const domains = Object.keys(adapter);

    expect(domains).toEqual(
      expect.arrayContaining([
        'auth',
        'tasks',
        'clients',
        'interventions',
        'settings',
        'dashboard',
        'users',
        'system',
        'ui',
      ]),
    );
  });

  it('auth.login resolves to TEST_SESSION by default', async () => {
    const adapter = createTestAdapter();
    const session = await adapter.auth.login('a@b.com', 'pw');
    expect(session).toEqual(TEST_SESSION);
  });

  it('tasks.get resolves to TEST_TASK by default', async () => {
    const adapter = createTestAdapter();
    const task = await adapter.tasks.get('any-id', 'tok');
    expect(task).toEqual(TEST_TASK);
  });

  it('tasks.list resolves to TEST_TASK_LIST by default', async () => {
    const adapter = createTestAdapter();
    const list = await adapter.tasks.list({}, 'tok');
    expect(list).toEqual(TEST_TASK_LIST);
  });

  it('applies overrides to specific domain methods', async () => {
    const customTask = { ...TEST_TASK, id: 'custom-1', title: 'Custom' };
    const adapter = createTestAdapter({
      tasks: {
        get: () => Promise.resolve(customTask as never),
      },
    });

    const task = await adapter.tasks.get('custom-1', 'tok');
    expect(task).toEqual(customTask);

    // other methods remain default
    const list = await adapter.tasks.list({}, 'tok');
    expect(list).toEqual(TEST_TASK_LIST);
  });

  it('system.healthCheck resolves with ok status', async () => {
    const adapter = createTestAdapter();
    const result = await adapter.system.healthCheck();
    expect(result).toEqual({ status: 'ok' });
  });
});
