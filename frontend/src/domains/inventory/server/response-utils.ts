import type { LowStockMaterial, LowStockMaterialsResponse, Material } from '@/shared/types';

type ApiErrorShape = {
  message?: string | null;
  code?: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  error_code?: string | null;
  compressed?: boolean;
  data?: T | null;
  error?: ApiErrorShape | null;
  correlation_id?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function normalizeApiError(response: ApiEnvelope<unknown>, ctx: string): string {
  const rawMessage = response.error?.message ?? response.message ?? `Request failed for ${ctx}`;
  const code = response.error?.code ?? response.error_code;
  return code ? `${rawMessage} (${code})` : rawMessage;
}

export async function unwrapApiResponse<T>(raw: unknown, ctx: string): Promise<T> {
  if (!isRecord(raw)) {
    return raw as T;
  }

  const response = raw as ApiEnvelope<unknown>;

  if (typeof response.success === 'boolean') {
    if (!response.success) {
      throw new Error(normalizeApiError(response, ctx));
    }

    if (response.compressed === true) {
      throw new Error(`Compressed responses are not supported for ${ctx}`);
    }

    if (response.compressed === false && typeof response.data === 'string') {
      try {
        return JSON.parse(response.data) as T;
      } catch {
        throw new Error(`Invalid uncompressed JSON response format for ${ctx}`);
      }
    }

    return response.data as T;
  }

  if (response.compressed === true) {
    throw new Error(`Compressed responses are not supported for ${ctx}`);
  }

  return raw as T;
}

function isMaterialLike(value: unknown): value is Material {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.sku === 'string' &&
    typeof value.name === 'string'
  );
}

export function validateMaterialListPayload(payload: unknown, ctx: string): Material[] {
  let maybeList: unknown = payload;

  if (isRecord(payload)) {
    if (Array.isArray(payload.items)) {
      maybeList = payload.items;
    } else if (Array.isArray(payload.data)) {
      maybeList = payload.data;
    }
  }

  if (!Array.isArray(maybeList)) {
    throw new Error(`Invalid response format for ${ctx}`);
  }

  if (!maybeList.every(isMaterialLike)) {
    throw new Error(`Invalid material payload for ${ctx}`);
  }

  return maybeList;
}

function isLowStockMaterialLike(value: unknown): value is LowStockMaterial {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.material_id === 'string' &&
    typeof value.sku === 'string' &&
    typeof value.name === 'string' &&
    typeof value.unit_of_measure === 'string' &&
    typeof value.current_stock === 'number' &&
    typeof value.reserved_stock === 'number' &&
    typeof value.available_stock === 'number' &&
    typeof value.minimum_stock === 'number' &&
    typeof value.effective_threshold === 'number' &&
    typeof value.shortage_quantity === 'number'
  );
}

export function validateLowStockPayload(payload: unknown, ctx: string): LowStockMaterialsResponse {
  if (!isRecord(payload)) {
    throw new Error(`Invalid response format for ${ctx}`);
  }

  const items = payload.items;
  const total = payload.total;
  if (!Array.isArray(items) || typeof total !== 'number') {
    throw new Error(`Invalid low stock response shape for ${ctx}`);
  }

  if (!items.every(isLowStockMaterialLike)) {
    throw new Error(`Invalid low stock item payload for ${ctx}`);
  }

  return { items, total };
}
