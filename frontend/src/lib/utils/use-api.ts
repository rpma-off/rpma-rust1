// Authenticated API hook for making authenticated requests

import { useAuthHeaders } from './auth-token';

/**
 * Hook that provides authenticated API methods
 */
export function useApi() {
  const authHeaders = useAuthHeaders();

  const apiGet = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });
  };

  const apiPost = async (url: string, data?: unknown, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  };

  const apiPut = async (url: string, data?: unknown, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, {
      method: 'PUT',
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  };

  const apiDelete = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, {
      method: 'DELETE',
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });
  };

  return {
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
  };
}