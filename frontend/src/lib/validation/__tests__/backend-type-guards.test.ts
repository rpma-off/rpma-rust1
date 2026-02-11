import {
  validateClientListResponse,
  validateClientStatistics,
} from '@/lib/validation/backend-type-guards';

const clientFixture = {
  id: 'client-1',
  name: 'Client One',
  email: null,
  phone: null,
  customer_type: 'individual',
  address_street: null,
  address_city: null,
  address_state: null,
  address_zip: null,
  address_country: null,
  tax_id: null,
  company_name: null,
  contact_person: null,
  notes: null,
  tags: null,
  total_tasks: 0,
  active_tasks: 0,
  completed_tasks: 0,
  last_task_date: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  created_by: null,
  deleted_at: null,
  deleted_by: null,
  synced: true,
  last_synced_at: null,
};

describe('backend-type-guards client validations', () => {
  it('parses client statistics matching backend shape', () => {
    const stats = validateClientStatistics({
      total_clients: 12,
      individual_clients: 8,
      business_clients: 4,
      clients_with_tasks: 10,
      new_clients_this_month: 2,
    });

    expect(stats).toEqual({
      total_clients: 12,
      individual_clients: 8,
      business_clients: 4,
      clients_with_tasks: 10,
      new_clients_this_month: 2,
    });
  });

  it('rejects invalid client statistics payloads', () => {
    expect(() =>
      validateClientStatistics({
        total_clients: 1,
        individual_clients: 1,
        business_clients: 0,
        clients_with_tasks: 1,
      })
    ).toThrow();
  });

  it('validates client list responses with pagination', () => {
    const listResponse = {
      data: [clientFixture],
      pagination: {
        page: 1,
        limit: 20,
        total: '1',
        total_pages: 1,
      },
      statistics: null,
    };

    expect(validateClientListResponse(listResponse)).toBe(true);
  });
});
