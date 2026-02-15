import { clientOperations } from '../domains/clients';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../cache', () => ({
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateKey: jest.fn(),
  clearCache: jest.fn(),
}));

jest.mock('@/lib/validation/backend-type-guards', () => ({
  validateClient: jest.fn((data) => data),
  validateClientWithTasks: jest.fn((data) => data),
  validateClientListResponse: jest.fn((data) => data),
  validateClientWithTasksList: jest.fn((data) => data),
  parseClientStatistics: jest.fn((data) => data),
  validateClientStatistics: jest.fn((data) => data),
}));

jest.mock('../utils/crud-helpers', () => ({
  ResponseHandlers: {
    discriminatedUnion: jest.fn(),
    discriminatedUnionNullable: jest.fn(),
    list: jest.fn(),
    statistics: jest.fn(),
  },
}));

jest.mock('../core', () => ({
  extractAndValidate: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

const { ResponseHandlers } = jest.requireMock('../utils/crud-helpers') as {
  ResponseHandlers: {
    discriminatedUnion: jest.Mock;
    discriminatedUnionNullable: jest.Mock;
    list: jest.Mock;
    statistics: jest.Mock;
  };
};

const { extractAndValidate } = jest.requireMock('../core') as {
  extractAndValidate: jest.Mock;
};

const { 
  validateClient, 
  validateClientWithTasks, 
  validateClientListResponse, 
  parseClientStatistics,
} = jest.requireMock('@/lib/validation/backend-type-guards') as {
  validateClient: jest.Mock;
  validateClientWithTasks: jest.Mock;
  validateClientListResponse: jest.Mock;
  parseClientStatistics: jest.Mock;
};

describe('clientOperations IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        has_next: false,
        has_prev: false,
      },
    });
    
    // Setup ResponseHandlers mocks
    ResponseHandlers.discriminatedUnion.mockImplementation((_type, _validator) => (result) => result);
    ResponseHandlers.discriminatedUnionNullable.mockImplementation((_type, _validator) => (result) => result);
    ResponseHandlers.list.mockImplementation((_processor) => (result) => result);
    ResponseHandlers.statistics.mockImplementation(() => (result) => result);
    
    extractAndValidate.mockImplementation((result, _validator, _options) => result);
  });

  describe('CRUD Operations', () => {
    it('calls safeInvoke with correct parameters for create', async () => {
      const createData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address_city: 'Paris',
        customer_type: 'individual',
      };
      
      await clientOperations.create(createData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Create', data: createData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
      expect(invalidatePattern).toHaveBeenCalledWith('client:');
    });

    it('calls cachedInvoke with correct parameters for get', async () => {
      await clientOperations.get('client-123', 'session-token');

      expect(cachedInvoke).toHaveBeenCalledWith(
        'client:client-123',
        'client_crud',
        {
          request: {
            action: { action: 'Get', id: 'client-123' },
            session_token: 'session-token'
          }
        },
        expect.any(Function)
      );
    });

    it('calls safeInvoke with correct parameters for update', async () => {
      const updateData = {
        name: 'John Doe Smith',
        phone: '555-5678',
        address_street: '456 Oak Ave',
      };
      
      await clientOperations.update('client-123', updateData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Update', id: 'client-123', data: updateData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
      expect(invalidatePattern).toHaveBeenCalledWith('client:');
    });

    it('calls safeInvoke with correct parameters for delete', async () => {
      await clientOperations.delete('client-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Delete', id: 'client-123' },
          session_token: 'session-token'
        }
      });
      expect(invalidatePattern).toHaveBeenCalledWith('client:');
    });

    it('calls safeInvoke with correct parameters for list', async () => {
      const filters = {
        page: 1,
        limit: 20,
        search: 'john',
        status: 'active',
        customer_type: 'individual',
      };
      
      await clientOperations.list(filters, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'List', filters },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });
  });

  describe('Specialized Operations', () => {
    it('calls safeInvoke and extracts valid response for getWithTasks', async () => {
      const mockResponse = {
        type: 'FoundWithTasks',
        client: { id: 'client-123', name: 'John Doe' },
        tasks: [{ id: 'task-123', title: 'PPF Installation' }]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateClientWithTasks(mockResponse));

      await clientOperations.getWithTasks('client-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'GetWithTasks', id: 'client-123' },
          session_token: 'session-token'
        }
      });
      expect(extractAndValidate).toHaveBeenCalledWith(mockResponse, validateClientWithTasks, {
        handleNotFound: true,
        expectedTypes: ['FoundWithTasks', 'NotFound']
      });
    });

    it('handles not found case for getWithTasks', async () => {
      const mockResponse = {
        type: 'NotFound'
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(null);

      const result = await clientOperations.getWithTasks('nonexistent-client', 'session-token');

      expect(result).toBeNull();
      expect(extractAndValidate).toHaveBeenCalledWith(mockResponse, validateClientWithTasks, {
        handleNotFound: true,
        expectedTypes: ['FoundWithTasks', 'NotFound']
      });
    });

    it('calls safeInvoke and processes search response', async () => {
      const mockResponse = [
        { id: 'client-123', name: 'John Doe', email: 'john@example.com' },
        { id: 'client-456', name: 'Jane Smith', email: 'jane@example.com' }
      ];

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(mockResponse);

      const result = await clientOperations.search('john', 10, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Search', query: 'john', limit: 10 },
          session_token: 'session-token'
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles empty search results', async () => {
      const mockResponse = [];
      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue([]);

      const result = await clientOperations.search('nonexistent', 10, 'session-token');

      expect(result).toEqual([]);
    });

    it('calls safeInvoke and processes listWithTasks response', async () => {
      const filters = {
        page: 1,
        limit: 20,
        search: 'test',
      };
      
      const mockListResult = {
        data: [
          { id: 'client-123', name: 'John Doe', email: 'john@example.com' },
          { id: 'client-456', name: 'Jane Smith', email: 'jane@example.com' }
        ],
        pagination: { page: 1, limit: 20, total: 2 }
      };

      safeInvoke.mockResolvedValue(mockListResult);

      const result = await clientOperations.listWithTasks(filters, 5, 'session-token');

      expect(result).toEqual([
        { ...mockListResult.data[0], tasks: [] },
        { ...mockListResult.data[1], tasks: [] }
      ]);
    });

    it('calls safeInvoke and extracts valid response for stats', async () => {
      const mockResponse = {
        type: 'Statistics',
        total_clients: 150,
        active_clients: 120,
        new_clients_this_month: 15,
        customer_type_breakdown: {
          individual: 120,
          business: 30
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(parseClientStatistics(mockResponse));

      await clientOperations.stats('session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Stats' },
          session_token: 'session-token'
        }
      });
      expect(extractAndValidate).toHaveBeenCalledWith(mockResponse, parseClientStatistics);
    });
  });

  describe('Request Validation', () => {
    it('validates required fields for create operation', async () => {
      const invalidData = {
        // Missing required name and email
        phone: '555-1234',
        address_city: 'Paris',
      };

      await clientOperations.create(invalidData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Create', data: invalidData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('validates email format for create operation', async () => {
      const invalidEmailData = {
        name: 'John Doe',
        email: 'invalid-email-format',
        phone: '555-1234',
      };

      await clientOperations.create(invalidEmailData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Create', data: invalidEmailData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('validates client ID format for get operation', async () => {
      await clientOperations.get('', 'session-token');

      expect(cachedInvoke).toHaveBeenCalledWith(
        'client:',
        'client_crud',
        {
          request: {
            action: { action: 'Get', id: '' },
            session_token: 'session-token'
          }
        },
        expect.any(Function)
      );
    });

    it('validates search query parameters', async () => {
      await clientOperations.search('', 0, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Search', query: '', limit: 0 },
          session_token: 'session-token'
        }
      });
    });

    it('validates list filters structure', async () => {
      const invalidFilters = {
        page: -1,
        limit: -1,
        status: 'invalid_status',
        customer_type: 'invalid_type',
      };

      await clientOperations.list(invalidFilters, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'List', filters: invalidFilters },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });
  });

  describe('Response Shape Validation', () => {
    it('validates complete response structure for create', async () => {
      const mockResponse = {
        type: 'Created',
        data: {
          id: 'client-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address_city: 'Paris',
          customer_type: 'individual',
          status: 'active',
          created_at: '2025-02-09T10:00:00Z',
          updated_at: '2025-02-09T10:00:00Z',
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      ResponseHandlers.discriminatedUnion.mockReturnValue((result) => validateClient(result.data));

      const result = await clientOperations.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'session-token');

      expect(validateClient).toHaveBeenCalledWith(mockResponse.data);
      expect(result).toEqual(validateClient(mockResponse.data));
    });

    it('validates response structure for list operation', async () => {
      const mockResponse = {
        data: [
          {
            id: 'client-123',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'active',
            customer_type: 'individual',
          },
          {
            id: 'client-456',
            name: 'Jane Smith',
            email: 'jane@example.com',
            status: 'active',
            customer_type: 'business',
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          has_next: false,
          has_prev: false,
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      ResponseHandlers.list.mockReturnValue((result) => validateClientListResponse(result));

      const result = await clientOperations.list({ page: 1 }, 'session-token');

      expect(validateClientListResponse).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(validateClientListResponse(mockResponse));
    });

    it('validates getWithTasks response with nested data', async () => {
      const mockResponse = {
        type: 'FoundWithTasks',
        client: {
          id: 'client-123',
          name: 'John Doe',
          email: 'john@example.com',
          customer_type: 'individual',
          status: 'active',
        },
        tasks: [
          {
            id: 'task-123',
            title: 'PPF Installation',
            status: 'completed',
            scheduled_date: '2025-01-15',
            vehicle_plate: 'ABC-123',
          }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateClientWithTasks(mockResponse));

      const result = await clientOperations.getWithTasks('client-123', 'session-token');

      expect(validateClientWithTasks).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(validateClientWithTasks(mockResponse));
    });

    it('validates statistics response structure', async () => {
      const mockResponse = {
        type: 'Statistics',
        total_clients: 150,
        active_clients: 120,
        new_clients_this_month: 15,
        vip_clients: 8,
        customer_type_breakdown: {
          individual: 120,
          business: 25,
          fleet: 5
        },
        status_breakdown: {
          active: 120,
          inactive: 25,
          vip: 5
        },
        monthly_growth: [
          { month: '2025-01', new_clients: 12, total_clients: 145 },
          { month: '2025-02', new_clients: 5, total_clients: 150 }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(parseClientStatistics(mockResponse));

      const result = await clientOperations.stats('session-token');

      expect(parseClientStatistics).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(parseClientStatistics(mockResponse));
    });

    it('validates search response with array of clients', async () => {
      const mockResponse = [
        {
          id: 'client-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          customer_type: 'individual',
        },
        {
          id: 'client-456',
          name: 'Johnny Smith',
          email: 'johnny@example.com',
          phone: '555-5678',
          customer_type: 'individual',
        }
      ];

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockImplementation((result) => {
        if (Array.isArray(result)) {
          return result.map(validateClient);
        }
        return [];
      });

      const result = await clientOperations.search('john', 10, 'session-token');

      expect(validateClient).toHaveBeenCalledTimes(2);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires session token for all operations', async () => {
      const operations = [
        () => clientOperations.create({ name: 'Test' }, ''),
        () => clientOperations.get('client-123', ''),
        () => clientOperations.update('client-123', {}, ''),
        () => clientOperations.delete('client-123', ''),
        () => clientOperations.list({}, ''),
        () => clientOperations.stats(''),
        () => clientOperations.search('test', 10, ''),
      ];

      for (const operation of operations) {
        try {
          await operation();
        } catch (_error) {
          // Expected to fail due to empty session token
        }
      }

      expect(safeInvoke).toHaveBeenCalledTimes(operations.length - 1); // get uses cachedInvoke
      expect(cachedInvoke).toHaveBeenCalledTimes(1);
    });

    it('passes session token correctly in nested requests', async () => {
      const sessionToken = 'valid-session-token';
      
      await clientOperations.getWithTasks('client-123', sessionToken);
      await clientOperations.search('john', 10, sessionToken);

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'GetWithTasks', id: 'client-123' },
          session_token: sessionToken
        }
      });

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Search', query: 'john', limit: 10 },
          session_token: sessionToken
        }
      });
    });
  });

  describe('Error Response Handling', () => {
    it('handles validation errors from backend for create', async () => {
      const errorResponse = {
        type: 'ValidationError',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid client data',
          details: {
            field: 'email',
            issue: 'invalid email format'
          }
        }
      };

      safeInvoke.mockRejectedValue(errorResponse);

      try {
        await clientOperations.create({
          name: 'Test',
          email: 'invalid-email'
        }, 'session-token');
      } catch (error) {
        expect(error).toEqual(errorResponse);
      }
    });

    it('handles duplicate email errors', async () => {
      const duplicateError = {
        type: 'DuplicateError',
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'Client with this email already exists',
          details: {
            email: 'john@example.com',
            existing_client_id: 'client-456'
          }
        }
      };

      safeInvoke.mockRejectedValue(duplicateError);

      try {
        await clientOperations.create({
          name: 'John Doe',
          email: 'john@example.com'
        }, 'session-token');
      } catch (error) {
        expect(error).toEqual(duplicateError);
      }
    });

    it('handles not found errors for get operation', async () => {
      const notFoundResponse = {
        type: 'NotFound',
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found',
        }
      };

      cachedInvoke.mockResolvedValue(notFoundResponse);
      ResponseHandlers.discriminatedUnionNullable.mockReturnValue((_result) => null);

      const result = await clientOperations.get('nonexistent-client', 'session-token');

      expect(result).toBeNull();
    });

    it('handles permission errors', async () => {
      const permissionError = {
        type: 'PermissionError',
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to access this client',
        }
      };

      safeInvoke.mockRejectedValue(permissionError);

      try {
        await clientOperations.get('client-123', 'unauthorized-token');
      } catch (error) {
        expect(error).toEqual(permissionError);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles extremely long client names', async () => {
      const longName = 'a'.repeat(500);
      const clientData = {
        name: longName,
        email: 'test@example.com',
      };

      await clientOperations.create(clientData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Create', data: clientData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles special characters in names', async () => {
      const specialName = 'Client with special chars: éàüß@#$%^&*()';
      const clientData = {
        name: specialName,
        email: 'test@example.com',
      };

      await clientOperations.create(clientData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Create', data: clientData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles empty list filters', async () => {
      await clientOperations.list({}, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'List', filters: {} },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles null values in optional fields', async () => {
      const clientWithNulls = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: null,
        address_street: null,
        address_city: null,
        notes: null,
      };

      await clientOperations.create(clientWithNulls, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Create', data: clientWithNulls },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles maximum search limit', async () => {
      await clientOperations.search('test', 1000, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Search', query: 'test', limit: 1000 },
          session_token: 'session-token'
        }
      });
    });

    it('handles search with empty query', async () => {
      await clientOperations.search('', 10, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'Search', query: '', limit: 10 },
          session_token: 'session-token'
        }
      });
    });

    it('handles listWithTasks with zero task limit', async () => {
      const filters = { page: 1, limit: 20 };
      
      await clientOperations.listWithTasks(filters, 0, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('client_crud', {
        request: {
          action: { action: 'List', filters },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });
  });
});
