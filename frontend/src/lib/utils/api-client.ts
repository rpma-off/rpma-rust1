// API client utilities for HTTP requests with automatic authentication

/**
 * Get authenticated headers for API requests
 * Note: This must be called within a React component that has access to AuthContext
 */
export function getAuthHeaders(): Record<string, string> {
  // This is a client-side utility, so we need to get headers synchronously
  // We'll need to call this from components that have access to the auth context
  // For now, return basic headers and let individual components add auth
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Make an authenticated API request
 * This function should be called from React components that have access to auth context
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Get auth headers from the calling component
  const authHeaders = (window as Window & { __authHeaders?: Record<string, string> }).__authHeaders || {};

  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function apiGet(url: string, authHeaders?: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  });
}

export async function apiPost(url: string, data?: unknown, authHeaders?: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiPut(url: string, data?: unknown, authHeaders?: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiDelete(url: string, authHeaders?: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  });
}
