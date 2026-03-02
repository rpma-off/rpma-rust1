import { unwrapApiResponse, validateMaterialListPayload } from '../server/response-utils';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

jest.mock('@/lib/ipc/core', () => ({
  safeInvoke: jest.fn(),
}));

const mockSafeInvoke = safeInvoke as jest.MockedFunction<typeof safeInvoke>;

const material = {
  id: 'mat-1',
  sku: 'SKU-1',
  name: 'Material 1',
  material_type: 'ppf_film',
  unit_of_measure: 'meter',
  current_stock: 10,
  currency: 'EUR',
  is_active: true,
  is_discontinued: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  synced: true,
};

describe('inventory response-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps ApiResponse success payload', async () => {
    const result = await unwrapApiResponse<unknown[]>({
      success: true,
      data: [material],
    }, 'test ctx', 'token');

    expect(result).toEqual([material]);
  });

  it('throws normalized error for ApiResponse failure', async () => {
    await expect(
      unwrapApiResponse({
        success: false,
        message: 'Failed request',
        error_code: 'VALIDATION_ERROR',
      }, 'test ctx', 'token')
    ).rejects.toThrow('Failed request (VALIDATION_ERROR)');
  });

  it('decompresses compressed response payload', async () => {
    mockSafeInvoke.mockResolvedValueOnce([material] as never);

    const result = await unwrapApiResponse<unknown[]>({
      success: true,
      compressed: true,
      data: 'base64-gzip-payload',
    }, 'test ctx', 'session-token');

    expect(result).toEqual([material]);
    expect(mockSafeInvoke).toHaveBeenCalledWith(
      IPC_COMMANDS.DECOMPRESS_DATA_FROM_IPC,
      {
        sessionToken: 'session-token',
        request: {
          compressed: {
            data: 'base64-gzip-payload',
            original_size: 0,
            compressed_size: 0,
            compression_ratio: 0,
          },
        },
      }
    );
  });

  it('throws for invalid list payload', () => {
    expect(() => validateMaterialListPayload({ invalid: true }, 'low stock')).toThrow(
      'Invalid response format for low stock'
    );
  });

  it('accepts list payload in items wrapper', () => {
    const result = validateMaterialListPayload({ items: [material] }, 'low stock');
    expect(result).toEqual([material]);
  });
});
