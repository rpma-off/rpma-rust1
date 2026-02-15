// Mock Supabase server client for compatibility
// Since this is a Tauri app, Supabase is not used

interface MockUser {
  id: string;
  [key: string]: unknown;
}

interface MockAuthResponse {
  data: { user: MockUser };
  error: null;
}

interface MockDatabaseResponse<T = unknown> {
  data: T | null;
  error: null;
}

interface MockDatabaseResponseWithCount<T = unknown> extends MockDatabaseResponse<T> {
  count?: number;
}

interface MockQueryBuilder<T = unknown> {
  select(): MockQueryBuilder<T>;
  select(columns: string): MockQueryBuilder<T>;
  select(columns: string, options: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): MockQueryBuilder<T>;
  eq: (column: string, value: unknown) => MockQueryBuilder<T>;
  in: (column: string, values: unknown[]) => MockQueryBuilder<T>;
  order: (column: string, options?: Record<string, unknown>) => MockQueryBuilder<T>;
  limit: (count: number) => MockQueryBuilder<T>;
  single: () => Promise<MockDatabaseResponse<T>>;
  gte: (column: string, value: unknown) => MockQueryBuilder<T>;
  lte: (column: string, value: unknown) => MockQueryBuilder<T>;
  not: (column: string, operator: string, value: unknown) => MockQueryBuilder<T>;
  or: (query: string) => MockQueryBuilder<T>;
  then: <R>(resolve: (value: MockDatabaseResponseWithCount<T>) => R) => Promise<R>;
}

interface MockTable<T = unknown> {
  select: (columns?: string) => MockQueryBuilder<T>;
  insert: (data: T) => MockQueryBuilder<T>;
  update: (data: Partial<T>) => MockQueryBuilder<T>;
  delete: () => MockQueryBuilder<T>;
}

interface MockStorage {
  from: (bucket: string) => {
    upload: (path: string, file: File | Blob) => MockDatabaseResponse;
    remove: (paths: string[]) => MockDatabaseResponse;
  };
}

interface MockSupabaseClient {
  auth: {
    getUser: (token?: string) => Promise<MockAuthResponse>;
  };
  from: <T = unknown>(table: string) => MockTable<T>;
  storage: MockStorage;
  rpc: <T = unknown>(funcName: string, params?: Record<string, unknown>) => Promise<MockDatabaseResponse<T>>;
  supabaseUrl: string;
  supabaseKey: string;
  realtime: unknown;
  realtimeUrl: string;
  rest: unknown;
  functions: unknown;
  edgeFunctions: unknown;
  authUrl: string;
  storageUrl: string;
  functionsUrl: string;
  storageKey: string;
}

class MockQueryBuilderImpl<T = unknown> implements MockQueryBuilder<T> {
  private hasCount = false;

  select(): MockQueryBuilder<T>;
  select(_columns: string): MockQueryBuilder<T>;
  select(_columns: string, options: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): MockQueryBuilder<T>;
  select(_columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): MockQueryBuilder<T> {
    if (options?.count === 'exact') {
      this.hasCount = true;
    }
    return this;
  }

  eq(_column: string, _value: unknown): MockQueryBuilder<T> {
    return this;
  }

  in(_column: string, _values: unknown[]): MockQueryBuilder<T> {
    return this;
  }

  order(_column: string, _options?: Record<string, unknown>): MockQueryBuilder<T> {
    return this;
  }

  limit(_count: number): MockQueryBuilder<T> {
    return this;
  }

  gte(_column: string, _value: unknown): MockQueryBuilder<T> {
    return this;
  }

  lte(_column: string, _value: unknown): MockQueryBuilder<T> {
    return this;
  }

  not(_column: string, _operator: string, _value: unknown): MockQueryBuilder<T> {
    return this;
  }

  or(_query: string): MockQueryBuilder<T> {
    return this;
  }

  single(): Promise<MockDatabaseResponse<T>> {
    return Promise.resolve({ data: null, error: null });
  }

  then<R>(resolve: (value: MockDatabaseResponseWithCount<T>) => R): Promise<R> {
    const response: MockDatabaseResponseWithCount<T> = {
      data: [] as unknown as T,
      error: null,
      ...(this.hasCount && { count: 0 })
    };
    return Promise.resolve(response).then(resolve);
  }
}

export const createClient = async (): Promise<MockSupabaseClient> => {
  return {
    auth: {
      getUser: async (_token?: string): Promise<MockAuthResponse> => ({
        data: { user: { id: 'mock-user-id' } },
        error: null
      }),
    },
    from: <T = unknown>(_table: string): MockTable<T> => ({
      select: (_columns?: string): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
      insert: (_data: T): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
      update: (_data: Partial<T>): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
      delete: (): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
    }),
    storage: {
      from: (_bucket: string) => ({
        upload: (_path: string, _file: File | Blob): MockDatabaseResponse => ({
          data: null,
          error: null,
        }),
        remove: (_paths: string[]): MockDatabaseResponse => ({
          data: null,
          error: null,
        }),
      }),
    },
    rpc: <T = unknown>(_funcName: string, _params?: Record<string, unknown>): Promise<MockDatabaseResponse<T>> =>
      Promise.resolve({ data: null, error: null }),
    supabaseUrl: 'mock-url',
    supabaseKey: 'mock-key',
    realtime: {},
    realtimeUrl: 'mock-realtime-url',
    rest: {},
    functions: {},
    edgeFunctions: {},
    authUrl: 'mock-auth-url',
    storageUrl: 'mock-storage-url',
    functionsUrl: 'mock-functions-url',
    storageKey: 'mock-storage-key',
  };
};

export const createServerClient = (): MockSupabaseClient => {
  return {
    auth: {
      getUser: async (_token?: string): Promise<MockAuthResponse> => ({
        data: { user: { id: 'mock-user-id' } },
        error: null
      }),
    },
    from: <T = unknown>(_table: string): MockTable<T> => ({
      select: (_columns?: string): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
      insert: (_data: T): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
      update: (_data: Partial<T>): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
      delete: (): MockQueryBuilder<T> => new MockQueryBuilderImpl<T>(),
    }),
    storage: {
      from: (_bucket: string) => ({
        upload: (_path: string, _file: File | Blob): MockDatabaseResponse => ({
          data: null,
          error: null,
        }),
        remove: (_paths: string[]): MockDatabaseResponse => ({
          data: null,
          error: null,
        }),
      }),
    },
    rpc: <T = unknown>(_funcName: string, _params?: Record<string, unknown>): Promise<MockDatabaseResponse<T>> =>
      Promise.resolve({ data: null, error: null }),
    supabaseUrl: 'mock-url',
    supabaseKey: 'mock-key',
    realtime: {},
    realtimeUrl: 'mock-realtime-url',
    rest: {},
    functions: {},
    edgeFunctions: {},
    authUrl: 'mock-auth-url',
    storageUrl: 'mock-storage-url',
    functionsUrl: 'mock-functions-url',
    storageKey: 'mock-storage-key',
  };
};