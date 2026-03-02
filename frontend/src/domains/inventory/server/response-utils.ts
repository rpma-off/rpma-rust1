import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { Material } from '@/shared/types';
import type { JsonObject } from '@/types/json';

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

type DecompressPayload = {
  request: {
    compressed: {
      data: string;
      original_size: number;
      compressed_size: number;
      compression_ratio: number;
    };
  };
  sessionToken: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function normalizeApiError(response: ApiEnvelope<unknown>, ctx: string): string {
  const rawMessage = response.error?.message ?? response.message ?? `Request failed for ${ctx}`;
  const code = response.error?.code ?? response.error_code;
  return code ? `${rawMessage} (${code})` : rawMessage;
}

async function decompressApiData(data: string, sessionToken: string): Promise<unknown> {
  const payload: DecompressPayload = {
    sessionToken,
    request: {
      compressed: {
        data,
        original_size: 0,
        compressed_size: 0,
        compression_ratio: 0,
      },
    },
  };

  return safeInvoke<unknown>(IPC_COMMANDS.DECOMPRESS_DATA_FROM_IPC, payload as unknown as JsonObject);
}

export async function unwrapApiResponse<T>(raw: unknown, ctx: string, sessionToken?: string): Promise<T> {
  if (!isRecord(raw)) {
    return raw as T;
  }

  const response = raw as ApiEnvelope<unknown>;

  if (typeof response.success === 'boolean') {
    if (!response.success) {
      throw new Error(normalizeApiError(response, ctx));
    }

    if (response.compressed === true) {
      if (typeof response.data !== 'string') {
        throw new Error(`Invalid compressed response format for ${ctx}`);
      }
      if (!sessionToken) {
        throw new Error(`Missing session token for compressed response in ${ctx}`);
      }
      return await decompressApiData(response.data, sessionToken) as T;
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
    if (typeof response.data !== 'string') {
      throw new Error(`Invalid compressed response format for ${ctx}`);
    }
    if (!sessionToken) {
      throw new Error(`Missing session token for compressed response in ${ctx}`);
    }
    return await decompressApiData(response.data, sessionToken) as T;
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
