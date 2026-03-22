import type { UserSession, UserRole, Task, Client, Intervention, InterventionStep } from '@/lib/backend';
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
  interventions?: MockIntervention[];
  interventionSteps?: MockInterventionStep[];
}

export type MockIntervention = Omit<Intervention, 'created_at' | 'updated_at' | 'last_synced_at' | 'scheduled_at' | 'started_at' | 'completed_at' | 'paused_at'> & {
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
};

export type MockInterventionStep = Omit<InterventionStep, 'created_at' | 'updated_at' | 'last_synced_at' | 'started_at' | 'completed_at' | 'paused_at' | 'approved_at' | 'device_timestamp' | 'server_timestamp'> & {
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  approved_at: string | null;
  device_timestamp: string;
  server_timestamp: string;
};

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
    },
    {
      id: 'client-2',
      name: 'Alice Smith',
      email: 'alice@example.com',
      phone: '555-2000',
      customer_type: 'individual',
      address_street: '456 Oak Ave',
      address_city: 'Springfield',
      address_state: 'IL',
      address_zip: '62701',
      address_country: 'US',
      tax_id: null,
      company_name: null,
      contact_person: null,
      notes: null,
      tags: null,
      total_tasks: 0,
      active_tasks: 0,
      completed_tasks: 0,
      last_task_date: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      synced: true,
      last_synced_at: nowIso()
    },
    {
      id: 'client-3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      phone: '555-3000',
      customer_type: 'individual',
      address_street: '789 Elm St',
      address_city: 'Shelbyville',
      address_state: 'IL',
      address_zip: '62565',
      address_country: 'US',
      tax_id: null,
      company_name: null,
      contact_person: null,
      notes: null,
      tags: null,
      total_tasks: 0,
      active_tasks: 0,
      completed_tasks: 0,
      last_task_date: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      synced: true,
      last_synced_at: nowIso()
    },
    {
      id: 'client-4',
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '555-4000',
      customer_type: 'business',
      address_street: '100 Corporate Blvd',
      address_city: 'Metropolis',
      address_state: 'NY',
      address_zip: '10001',
      address_country: 'US',
      tax_id: 'TAX-001',
      company_name: 'Acme Corporation',
      contact_person: 'Wile E. Coyote',
      notes: null,
      tags: null,
      total_tasks: 0,
      active_tasks: 0,
      completed_tasks: 0,
      last_task_date: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      synced: true,
      last_synced_at: nowIso()
    },
    {
      id: 'client-5',
      name: 'Zebra Client',
      email: 'zebra@example.com',
      phone: '555-5000',
      customer_type: 'individual',
      address_street: '999 Z Street',
      address_city: 'Last City',
      address_state: 'CA',
      address_zip: '90210',
      address_country: 'US',
      tax_id: null,
      company_name: null,
      contact_person: null,
      notes: null,
      tags: null,
      total_tasks: 0,
      active_tasks: 0,
      completed_tasks: 0,
      last_task_date: null,
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
