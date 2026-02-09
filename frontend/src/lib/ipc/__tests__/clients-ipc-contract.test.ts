import { ipcClient } from '../client';

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

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('ipcClient.clients IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      clients: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        has_next: false,
        has_prev: false,
      },
    });
  });

  // Basic CRUD Operations
  describe('Client CRUD operations', () => {
    it('uses top-level sessionToken for clients_list', async () => {
      await ipcClient.clients.list('token-a', {
        page: 1,
        limit: 20,
        search: 'john',
        status: 'active',
        customer_type: 'individual',
        city: 'Paris',
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_list', {
        sessionToken: 'token-a',
        page: 1,
        limit: 20,
        search: 'john',
        status: 'active',
        customer_type: 'individual',
        city: 'Paris',
      });
    });

    it('uses nested request.session_token for client_create', async () => {
      await ipcClient.clients.create(
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address_street: '123 Main St',
          address_city: 'Paris',
          address_country: 'France',
          customer_type: 'individual',
          notes: 'New client from referral',
          preferred_contact_method: 'email',
        },
        'token-b'
      );

      expect(safeInvoke).toHaveBeenCalledWith('client_create', {
        request: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address_street: '123 Main St',
          address_city: 'Paris',
          address_country: 'France',
          customer_type: 'individual',
          notes: 'New client from referral',
          preferred_contact_method: 'email',
          session_token: 'token-b',
        },
      });
    });

    it('uses nested request.session_token for client_update', async () => {
      await ipcClient.clients.update(
        'client-123',
        {
          name: 'John Doe Smith',
          phone: '555-5678',
          address_street: '456 Oak Ave',
          notes: 'Updated contact information',
        },
        'token-c'
      );

      expect(safeInvoke).toHaveBeenCalledWith('client_update', {
        id: 'client-123',
        request: {
          name: 'John Doe Smith',
          phone: '555-5678',
          address_street: '456 Oak Ave',
          notes: 'Updated contact information',
          session_token: 'token-c',
        },
      });
    });

    it('uses top-level sessionToken for client_get', async () => {
      await ipcClient.clients.get('client-123', 'token-d');

      expect(safeInvoke).toHaveBeenCalledWith('client_get', {
        sessionToken: 'token-d',
        id: 'client-123',
      });
    });

    it('uses top-level sessionToken for client_delete', async () => {
      await ipcClient.clients.delete('client-123', 'token-e');

      expect(safeInvoke).toHaveBeenCalledWith('client_delete', {
        sessionToken: 'token-e',
        id: 'client-123',
      });
    });
  });

  // Advanced Search and Filtering
  describe('Advanced search and filtering', () => {
    it('uses top-level sessionToken for search_clients', async () => {
      await ipcClient.clients.search('token-f', {
        query: 'John Doe Tesla',
        filters: {
          customer_type: ['individual', 'business'],
          status: ['active', 'vip'],
          city: ['Paris', 'Lyon'],
          has_vehicles: true,
          created_after: '2024-01-01',
        },
        sort: {
          field: 'last_name',
          direction: 'asc',
        },
        pagination: {
          page: 2,
          limit: 25,
        },
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_search', {
        sessionToken: 'token-f',
        query: 'John Doe Tesla',
        filters: {
          customer_type: ['individual', 'business'],
          status: ['active', 'vip'],
          city: ['Paris', 'Lyon'],
          has_vehicles: true,
          created_after: '2024-01-01',
        },
        sort: {
          field: 'last_name',
          direction: 'asc',
        },
        pagination: {
          page: 2,
          limit: 25,
        },
      });
    });

    it('uses top-level sessionToken for get_by_vehicle', async () => {
      await ipcClient.clients.getByVehicle('ABC-123', 'token-g');

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_by_vehicle', {
        sessionToken: 'token-g',
        vehicle_plate: 'ABC-123',
      });
    });

    it('uses top-level sessionToken for get_by_email', async () => {
      await ipcClient.clients.getByEmail('john@example.com', 'token-h');

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_by_email', {
        sessionToken: 'token-h',
        email: 'john@example.com',
      });
    });

    it('uses top-level sessionToken for get_by_phone', async () => {
      await ipcClient.clients.getByPhone('555-1234', 'token-i');

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_by_phone', {
        sessionToken: 'token-i',
        phone: '555-1234',
      });
    });
  });

  // Task Integration
  describe('Task integration', () => {
    it('uses top-level sessionToken for get_with_tasks', async () => {
      await ipcClient.clients.getWithTasks('client-123', 'token-j', {
        task_status: 'completed',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        include_interventions: true,
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_with_tasks', {
        sessionToken: 'token-j',
        client_id: 'client-123',
        task_status: 'completed',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        include_interventions: true,
      });
    });

    it('uses top-level sessionToken for list_with_tasks', async () => {
      await ipcClient.clients.listWithTasks('token-k', {
        page: 1,
        limit: 20,
        has_active_tasks: true,
        min_completed_tasks: 5,
        sort: 'last_task_date',
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_list_with_tasks', {
        sessionToken: 'token-k',
        page: 1,
        limit: 20,
        has_active_tasks: true,
        min_completed_tasks: 5,
        sort: 'last_task_date',
      });
    });
  });

  // Vehicle Management
  describe('Vehicle management', () => {
    it('uses nested request.session_token for add_vehicle', async () => {
      await ipcClient.clients.addVehicle(
        'client-123',
        {
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          color: 'Red',
          vin: '1HGCM82633A004352',
          license_plate: 'ABC-123',
          vehicle_type: 'sedan',
          notes: 'Primary vehicle for PPF services',
        },
        'token-l'
      );

      expect(safeInvoke).toHaveBeenCalledWith('client_add_vehicle', {
        request: {
          client_id: 'client-123',
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          color: 'Red',
          vin: '1HGCM82633A004352',
          license_plate: 'ABC-123',
          vehicle_type: 'sedan',
          notes: 'Primary vehicle for PPF services',
          session_token: 'token-l',
        },
      });
    });

    it('uses nested request.session_token for update_vehicle', async () => {
      await ipcClient.clients.updateVehicle(
        'vehicle-123',
        {
          color: 'Blue',
          license_plate: 'XYZ-789',
          notes: 'Updated vehicle information',
        },
        'token-m'
      );

      expect(safeInvoke).toHaveBeenCalledWith('client_update_vehicle', {
        request: {
          vehicle_id: 'vehicle-123',
          color: 'Blue',
          license_plate: 'XYZ-789',
          notes: 'Updated vehicle information',
          session_token: 'token-m',
        },
      });
    });

    it('uses top-level sessionToken for delete_vehicle', async () => {
      await ipcClient.clients.deleteVehicle('vehicle-123', 'token-n');

      expect(safeInvoke).toHaveBeenCalledWith('client_delete_vehicle', {
        sessionToken: 'token-n',
        vehicle_id: 'vehicle-123',
      });
    });

    it('uses top-level sessionToken for get_vehicles', async () => {
      await ipcClient.clients.getVehicles('client-123', 'token-o');

      expect(safeInvoke).toHaveBeenCalledWith('client_get_vehicles', {
        sessionToken: 'token-o',
        client_id: 'client-123',
      });
    });
  });

  // Statistics and Analytics
  describe('Statistics and analytics', () => {
    it('uses top-level sessionToken for get_statistics', async () => {
      await ipcClient.clients.getStatistics('token-p', {
        period: 'year',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        group_by: 'customer_type',
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_statistics', {
        sessionToken: 'token-p',
        period: 'year',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        group_by: 'customer_type',
      });
    });

    it('uses top-level sessionToken for get_client_history', async () => {
      await ipcClient.clients.getClientHistory('client-123', 'token-q', {
        history_type: 'all',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        page: 1,
        limit: 50,
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_client_history', {
        sessionToken: 'token-q',
        client_id: 'client-123',
        history_type: 'all',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        page: 1,
        limit: 50,
      });
    });

    it('uses top-level sessionToken for get_lifetime_value', async () => {
      await ipcClient.clients.getLifetimeValue('client-123', 'token-r');

      expect(safeInvoke).toHaveBeenCalledWith('clients_get_lifetime_value', {
        sessionToken: 'token-r',
        client_id: 'client-123',
      });
    });
  });

  // Communications
  describe('Communications', () => {
    it('uses nested request.session_token for send_communication', async () => {
      await ipcClient.clients.sendCommunication(
        'client-123',
        {
          type: 'email',
          subject: 'PPF Installation Reminder',
          content: 'This is a reminder about your upcoming PPF installation appointment.',
          scheduled_for: '2025-02-10T09:00:00Z',
          attachments: ['appointment-details.pdf'],
        },
        'token-s'
      );

      expect(safeInvoke).toHaveBeenCalledWith('client_send_communication', {
        request: {
          client_id: 'client-123',
          type: 'email',
          subject: 'PPF Installation Reminder',
          content: 'This is a reminder about your upcoming PPF installation appointment.',
          scheduled_for: '2025-02-10T09:00:00Z',
          attachments: ['appointment-details.pdf'],
          session_token: 'token-s',
        },
      });
    });

    it('uses top-level sessionToken for get_communication_history', async () => {
      await ipcClient.clients.getCommunicationHistory('client-123', 'token-t', {
        type: 'email',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        page: 1,
        limit: 25,
      });

      expect(safeInvoke).toHaveBeenCalledWith('client_get_communication_history', {
        sessionToken: 'token-t',
        client_id: 'client-123',
        type: 'email',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        page: 1,
        limit: 25,
      });
    });
  });

  // Special Operations
  describe('Special operations', () => {
    it('uses nested request.session_token for merge_clients', async () => {
      await ipcClient.clients.merge(
        {
          primary_client_id: 'client-123',
          duplicate_client_ids: ['client-456', 'client-789'],
          merge_data: {
            tasks: true,
            vehicles: true,
            communications: true,
            payment_history: true,
          },
          notes: 'Merging duplicate client records',
        },
        'token-u'
      );

      expect(safeInvoke).toHaveBeenCalledWith('clients_merge', {
        request: {
          primary_client_id: 'client-123',
          duplicate_client_ids: ['client-456', 'client-789'],
          merge_data: {
            tasks: true,
            vehicles: true,
            communications: true,
            payment_history: true,
          },
          notes: 'Merging duplicate client records',
          session_token: 'token-u',
        },
      });
    });

    it('uses nested request.session_token for update_status', async () => {
      await ipcClient.clients.updateStatus(
        'client-123',
        {
          status: 'vip',
          reason: 'High-value client with frequent services',
          effective_date: '2025-02-10',
          notes: 'Upgrading to VIP status based on service frequency',
        },
        'token-v'
      );

      expect(safeInvoke).toHaveBeenCalledWith('client_update_status', {
        request: {
          client_id: 'client-123',
          status: 'vip',
          reason: 'High-value client with frequent services',
          effective_date: '2025-02-10',
          notes: 'Upgrading to VIP status based on service frequency',
          session_token: 'token-v',
        },
      });
    });

    it('uses top-level sessionToken for export_clients_csv', async () => {
      await ipcClient.clients.exportCsv('token-w', {
        status: 'active',
        customer_type: 'individual',
        include_vehicles: true,
        include_tasks: true,
        created_after: '2024-01-01',
      });

      expect(safeInvoke).toHaveBeenCalledWith('clients_export_csv', {
        sessionToken: 'token-w',
        status: 'active',
        customer_type: 'individual',
        include_vehicles: true,
        include_tasks: true,
        created_after: '2024-01-01',
      });
    });

    it('uses nested request.session_token for import_clients_bulk', async () => {
      await ipcClient.clients.importBulk(
        {
          format: 'csv',
          data: 'name,email,phone,address_city\John Doe,john@example.com,555-1234,Paris\nJane Smith,jane@example.com,555-5678,Lyon',
          options: {
            create_missing_vehicles: true,
            update_existing: true,
            validation_mode: 'strict',
          },
        },
        'token-x'
      );

      expect(safeInvoke).toHaveBeenCalledWith('clients_import_bulk', {
        request: {
          format: 'csv',
          data: 'name,email,phone,address_city\John Doe,john@example.com,555-1234,Paris\nJane Smith,jane@example.com,555-5678,Lyon',
          options: {
            create_missing_vehicles: true,
            update_existing: true,
            validation_mode: 'strict',
          },
          session_token: 'token-x',
        },
      });
    });
  });

  // Cache Invalidation Tests
  describe('Cache invalidation', () => {
    it('invalidates cache patterns for client_update', async () => {
      await ipcClient.clients.update(
        'client-123',
        {
          name: 'Updated Name',
          phone: '555-9999',
        },
        'token-c'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('clients:*');
      expect(invalidatePattern).toHaveBeenCalledWith('client:*');
    });

    it('invalidates cache patterns for client_delete', async () => {
      await ipcClient.clients.delete('client-123', 'token-e');

      expect(invalidatePattern).toHaveBeenCalledWith('clients:*');
      expect(invalidatePattern).toHaveBeenCalledWith('client:*');
    });

    it('invalidates cache patterns for add_vehicle', async () => {
      await ipcClient.clients.addVehicle(
        'client-123',
        {
          make: 'Tesla',
          model: 'Model 3',
          license_plate: 'ABC-123',
        },
        'token-l'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('client:*');
      expect(invalidatePattern).toHaveBeenCalledWith('client:vehicles:*');
    });

    it('invalidates cache patterns for update_status', async () => {
      await ipcClient.clients.updateStatus(
        'client-123',
        {
          status: 'vip',
          reason: 'High-value client',
        },
        'token-v'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('clients:*');
      expect(invalidatePattern).toHaveBeenCalledWith('client:*');
    });
  });

  // Response Shape Tests
  describe('Response shape validation', () => {
    it('returns expected shape for clients_list', async () => {
      const mockResponse = {
        success: true,
        data: {
          clients: [
            {
              id: 'client-123',
              name: 'John Doe',
              email: 'john@example.com',
              phone: '555-1234',
              address_street: '123 Main St',
              address_city: 'Paris',
              address_country: 'France',
              customer_type: 'individual',
              status: 'active',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2025-02-09T10:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.list('token-a');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('clients');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.clients)).toBe(true);
      expect(result.data.clients[0]).toHaveProperty('id');
      expect(result.data.clients[0]).toHaveProperty('name');
      expect(result.data.clients[0]).toHaveProperty('email');
    });

    it('returns expected shape for client_get', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'client-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address_street: '123 Main St',
          address_city: 'Paris',
          address_country: 'France',
          customer_type: 'individual',
          status: 'active',
          preferred_contact_method: 'email',
          notes: 'Regular client, prefers morning appointments',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2025-02-09T10:00:00Z',
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.get('client-123', 'token-d');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('email');
      expect(result.data).toHaveProperty('customer_type');
      expect(result.data).toHaveProperty('status');
    });

    it('returns expected shape for get_with_tasks', async () => {
      const mockResponse = {
        success: true,
        data: {
          client: {
            id: 'client-123',
            name: 'John Doe',
            email: 'john@example.com',
          },
          tasks: [
            {
              id: 'task-123',
              title: 'PPF Installation',
              status: 'completed',
              scheduled_date: '2025-01-15',
              vehicle_plate: 'ABC-123',
              vehicle_make: 'Tesla',
              vehicle_model: 'Model 3',
            },
          ],
          interventions: [
            {
              id: 'intervention-123',
              task_id: 'task-123',
              status: 'completed',
              technician_id: 'tech-123',
              start_time: '2025-01-15T09:00:00Z',
              end_time: '2025-01-15T14:00:00Z',
            },
          ],
          statistics: {
            total_tasks: 5,
            completed_tasks: 4,
            total_spent: 1250.75,
            average_task_value: 250.15,
            last_service_date: '2025-01-15',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.getWithTasks('client-123', 'token-j');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('client');
      expect(result.data).toHaveProperty('tasks');
      expect(result.data).toHaveProperty('interventions');
      expect(result.data).toHaveProperty('statistics');
      expect(Array.isArray(result.data.tasks)).toBe(true);
      expect(Array.isArray(result.data.interventions)).toBe(true);
    });

    it('returns expected shape for get_vehicles', async () => {
      const mockResponse = {
        success: true,
        data: {
          client_id: 'client-123',
          vehicles: [
            {
              id: 'vehicle-123',
              make: 'Tesla',
              model: 'Model 3',
              year: 2023,
              color: 'Red',
              vin: '1HGCM82633A004352',
              license_plate: 'ABC-123',
              vehicle_type: 'sedan',
              is_primary: true,
              notes: 'Primary vehicle for PPF services',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2025-02-09T10:00:00Z',
            },
          ],
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.getVehicles('client-123', 'token-o');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('client_id');
      expect(result.data).toHaveProperty('vehicles');
      expect(Array.isArray(result.data.vehicles)).toBe(true);
      expect(result.data.vehicles[0]).toHaveProperty('id');
      expect(result.data.vehicles[0]).toHaveProperty('make');
      expect(result.data.vehicles[0]).toHaveProperty('model');
    });

    it('returns expected shape for get_statistics', async () => {
      const mockResponse = {
        success: true,
        data: {
          period: 'year',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          total_clients: 150,
          new_clients: 45,
          active_clients: 120,
          vip_clients: 15,
          customer_type_breakdown: {
            individual: 120,
            business: 25,
            fleet: 5,
          },
          status_breakdown: {
            active: 120,
            inactive: 25,
            vip: 5,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.getStatistics('token-p');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('period');
      expect(result.data).toHaveProperty('total_clients');
      expect(result.data).toHaveProperty('new_clients');
      expect(result.data).toHaveProperty('customer_type_breakdown');
      expect(result.data).toHaveProperty('status_breakdown');
    });
  });

  // Error Response Tests
  describe('Error response handling', () => {
    it('handles validation errors for client_create', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required and must be valid',
          details: {
            field: 'email',
            value: '',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.create(
        {
          name: 'Test Client',
          phone: '555-1234',
        },
        'token-b'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(result.error).toHaveProperty('message');
    });

    it('handles duplicate email errors for client_create', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'Client with this email already exists',
          details: {
            email: 'john@example.com',
            existing_client_id: 'client-456',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.create(
        {
          name: 'John Doe',
          email: 'john@example.com',
        },
        'token-b'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'DUPLICATE_EMAIL');
    });

    it('handles not found errors for client_get', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found',
          details: {
            client_id: 'non-existent-client',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.get('non-existent-client', 'token-d');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('handles vehicle duplicate errors for add_vehicle', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'DUPLICATE_VEHICLE',
          message: 'Vehicle with this license plate or VIN already exists',
          details: {
            license_plate: 'ABC-123',
            vin: '1HGCM82633A004352',
            existing_client_id: 'client-456',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.clients.addVehicle(
        'client-123',
        {
          make: 'Tesla',
          model: 'Model 3',
          license_plate: 'ABC-123',
          vin: '1HGCM82633A004352',
        },
        'token-l'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'DUPLICATE_VEHICLE');
    });
  });
});