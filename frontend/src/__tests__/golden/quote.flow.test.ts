/**
 * Golden Flow: Quote Creation
 *
 * Tests the quote_create lifecycle through the IPC layer:
 *   1. Create quote (success)
 *   2. Create quote (validation error — missing client_id)
 *   3. Session token auto-injection for protected command
 *   4. Correlation ID round-trip
 */

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
jest.mock('@/domains/auth', () => ({ getSessionToken: jest.fn() }));
jest.mock('@/lib/ipc/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/logging/types', () => ({
  LogDomain: { API: 'api' },
  CorrelationContext: {
    set: jest.fn(),
    getCurrentId: jest.fn(() => null),
    generateNew: jest.fn(() => 'corr-golden-quote'),
  },
}));

import { safeInvoke } from '@/lib/ipc/utils';
import {
  mockSuccess,
  mockValidationError,
  MOCK_QUOTE,
} from '../utils/mock-ipc';

const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as {
  invoke: jest.Mock;
};
const { getSessionToken } = jest.requireMock(
  '@/domains/auth',
) as { getSessionToken: jest.Mock };

describe('Golden Flow – Quote Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionToken.mockResolvedValue('golden-session-token');
  });

  // ─── 1. Create quote (success) ────────────────────────────────────

  it('creates a quote and receives the created record', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_QUOTE, 'corr-q1'));

    const result = await safeInvoke('quote_create', {
      request: {
        session_token: 'golden-session-token',
        data: {
          client_id: 'client-golden-1',
          task_id: 'task-golden-1',
          items: [
            { kind: 'labor', description: 'PPF installation', qty: 1, unit_price: 1500, tax_rate: 20 },
          ],
        },
      },
    });

    expect(result).toEqual(MOCK_QUOTE);
    expect(mockInvoke).toHaveBeenCalledWith(
      'quote_create',
      expect.objectContaining({
        request: expect.objectContaining({
          data: expect.objectContaining({ client_id: 'client-golden-1' }),
        }),
        correlation_id: expect.any(String),
      }),
    );
  });

  // ─── 2. Validation error (missing client_id) ─────────────────────

  it('throws validation error when client_id is missing', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockValidationError('client_id is required'),
    );

    await expect(
      safeInvoke('quote_create', {
        request: {
          session_token: 'golden-session-token',
          data: { items: [] },
        },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  // ─── 3. Validation error (empty items) ────────────────────────────

  it('throws validation error when items array is empty', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockValidationError('At least one item is required'),
    );

    await expect(
      safeInvoke('quote_create', {
        request: {
          session_token: 'golden-session-token',
          data: { client_id: 'client-golden-1', items: [] },
        },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  // ─── 4. Session token auto-injection ──────────────────────────────

  it('auto-injects session_token for quote_create (protected)', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_QUOTE));

    await safeInvoke('quote_create', {
      request: { data: { client_id: 'c1', items: [] } },
    });

    expect(getSessionToken).toHaveBeenCalled();
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBe('golden-session-token');
  });

  // ─── 5. Correlation ID is forwarded ───────────────────────────────

  it('includes correlation_id in the IPC call', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_QUOTE));

    await safeInvoke('quote_create', {
      request: {
        session_token: 'golden-session-token',
        data: { client_id: 'c1', items: [] },
      },
    });

    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs).toHaveProperty('correlation_id');
    expect(typeof calledArgs.correlation_id).toBe('string');
  });
});
