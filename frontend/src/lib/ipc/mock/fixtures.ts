import type { UserSession, UserRole, Task, Client } from '@/lib/backend';
import type { Material, Supplier, MaterialCategory } from '@/shared/types';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface MockFixtures {
  users: MockUser[];
  sessions: UserSession[];
  clients: Client[];
  tasks: Task[];
  materials: Material[];
  suppliers: Supplier[];
  categories: MaterialCategory[];
}

const nowIso = () => new Date().toISOString();

export const defaultFixtures: MockFixtures = {
  users: [
    {
      id: 'user-1',
      email: 'test@example.com',
      password: 'testpassword',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin'
    },
    {
      id: 'user-2',
      email: 'admin@test.com',
      password: 'adminpassword',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    }
  ],
  sessions: [],
  clients: [
    {
      id: 'client-1',
      name: 'Client A',
      email: 'clienta@example.com',
      phone: '555-1000',
      customer_type: 'individual',
      address_street: '123 Test Street',
      address_city: 'Test City',
      address_state: 'TS',
      address_zip: '12345',
      address_country: 'Test Country',
      tax_id: null,
      company_name: null,
      contact_person: null,
      notes: null,
      tags: null,
      total_tasks: 1,
      active_tasks: 1,
      completed_tasks: 0,
      last_task_date: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      synced: true,
      last_synced_at: nowIso()
    }
  ],
  tasks: [
    {
      id: 'task-1',
      task_number: 'TASK-0001',
      title: 'Initial PPF Task',
      description: 'Seeded task for E2E',
      vehicle_plate: 'TEST-001',
      vehicle_model: 'Model 3',
      vehicle_year: '2023',
      vehicle_make: 'Tesla',
      vin: '5YJ3E1EA1JF000001',
      ppf_zones: ['hood', 'fenders'],
      custom_ppf_zones: null,
      status: 'in_progress',
      priority: 'high',
      technician_id: null,
      assigned_at: null,
      assigned_by: null,
      scheduled_date: nowIso(),
      start_time: null,
      end_time: null,
      date_rdv: null,
      heure_rdv: null,
      template_id: null,
      workflow_id: null,
      workflow_status: null,
      current_workflow_step_id: null,
      started_at: null,
      completed_at: null,
      completed_steps: null,
      client_id: 'client-1',
      customer_name: 'Client A',
      customer_email: 'clienta@example.com',
      customer_phone: '555-1000',
      customer_address: '123 Test Street',
      external_id: null,
      lot_film: null,
      checklist_completed: false,
      notes: null,
      tags: null,
      estimated_duration: 4,
      actual_duration: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      creator_id: null,
      created_by: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
      synced: true,
      last_synced_at: nowIso()
    }
  ],
  materials: [
    {
      id: 'material-1',
      sku: 'PPF-001',
      name: 'Film PPF Premium',
      description: 'Premium PPF film',
      material_type: 'ppf_film',
      unit_of_measure: 'meter',
      current_stock: 100,
      minimum_stock: 20,
      maximum_stock: 500,
      reorder_point: 25,
      unit_cost: 15.5,
      currency: 'USD',
      is_active: true,
      is_discontinued: false,
      created_at: nowIso(),
      updated_at: nowIso(),
      synced: true,
      last_synced_at: nowIso()
    }
  ],
  suppliers: [
    {
      id: 'supplier-1',
      name: 'Default Supplier',
      lead_time_days: 7,
      is_active: true,
      is_preferred: true,
      created_at: nowIso(),
      updated_at: nowIso(),
      synced: true,
      last_synced_at: nowIso()
    }
  ],
  categories: [
    {
      id: 'category-1',
      name: 'PPF Films',
      code: 'PPF',
      level: 1,
      description: 'PPF materials',
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
      synced: true,
      last_synced_at: nowIso()
    }
  ]
};
