import type {
  UserSession,
  Task,
  Client,
  ClientStatistics,
  TaskStatistics,
  UserAccount,
  StepType,
  InterventionProgress,
} from '@/lib/backend';
import type { Material, Supplier, MaterialCategory, InventoryStats, MaterialStats, MaterialConsumption, InterventionMaterialSummary } from '@/shared/types';
import type { JsonObject } from '@/types/json';
import {
  defaultFixtures,
  type MockFixtures,
  type MockUser,
  type MockIntervention,
  type MockInterventionStep,
} from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

type DelayEntry = { ms: number };
type FailureEntry = { message: string };
const MOCK_SESSIONS_STORAGE_KEY = '__E2E_MOCK_SESSIONS__';

export interface MockState {
  users: MockUser[];
  sessions: UserSession[];
  clients: Client[];
  tasks: Task[];
  interventions: MockIntervention[];
  interventionSteps: MockInterventionStep[];
  materials: Material[];
  suppliers: Supplier[];
  categories: MaterialCategory[];
  materialConsumptions: MaterialConsumption[];
  photos: AnyRecord[];
}

const delayNext = new Map<string, DelayEntry>();
const failNext = new Map<string, FailureEntry>();

const nowIso = () => new Date().toISOString();

let state: MockState;

function readPersistedSessions(): UserSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MOCK_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: UserSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOCK_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore localStorage write failures in mock mode
  }
}

function createState(fixtures: MockFixtures): MockState {
  const persistedSessions = readPersistedSessions();
  const interventions = fixtures.interventions && fixtures.interventions.length > 0
    ? [...fixtures.interventions]
    : fixtures.tasks.map(task => normalizeIntervention(task));
  const interventionSteps = fixtures.interventionSteps && fixtures.interventionSteps.length > 0
    ? [...fixtures.interventionSteps]
    : interventions.flatMap(intervention => buildInterventionSteps(intervention.id));
  return {
    users: [...fixtures.users],
    sessions: fixtures.sessions.length > 0 ? [...fixtures.sessions] : persistedSessions,
    clients: [...fixtures.clients],
    tasks: [...fixtures.tasks],
    interventions,
    interventionSteps,
    materials: [...fixtures.materials],
    suppliers: [...fixtures.suppliers],
    categories: [...fixtures.categories],
    materialConsumptions: [],
    photos: []
  };
}

export function resetDb(fixtures: MockFixtures = defaultFixtures): void {
  state = createState(fixtures);
  persistSessions(state.sessions);
}

export function seedDb(partial: Partial<MockFixtures>): void {
  if (partial.users) state.users = [...partial.users];
  if (partial.sessions) state.sessions = [...partial.sessions];
  if (partial.clients) state.clients = [...partial.clients];
  if (partial.tasks) state.tasks = [...partial.tasks];
  if (partial.interventions) state.interventions = [...partial.interventions];
  if (partial.interventionSteps) state.interventionSteps = [...partial.interventionSteps];
  if (partial.materials) state.materials = [...partial.materials];
  if (partial.suppliers) state.suppliers = [...partial.suppliers];
  if (partial.categories) state.categories = [...partial.categories];
}

export function failNextCommand(command: string, message: string): void {
  failNext.set(command, { message });
}

export function delayNextCommand(command: string, ms: number): void {
  delayNext.set(command, { ms });
}

function consumeDelay(command: string): DelayEntry | undefined {
  const entry = delayNext.get(command);
  if (entry) delayNext.delete(command);
  return entry;
}

function consumeFailure(command: string): FailureEntry | undefined {
  const entry = failNext.get(command);
  if (entry) failNext.delete(command);
  return entry;
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSession(user: MockUser): UserSession {
  const id = generateId('session');
  const token = `${user.id}-token`;
  const session: UserSession = {
    id,
    user_id: user.id,
    username: user.email,
    email: user.email,
    role: user.role,
    token,
    expires_at: nowIso(),
    last_activity: nowIso(),
    created_at: nowIso(),
  };
  return session;
}

function toUserAccount(user: MockUser): UserAccount {
  const now = nowIso();
  return {
    id: user.id,
    email: user.email,
    username: user.email.split('@')[0] || user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    phone: null,
    is_active: true,
    last_login: null,
    login_count: 1,
    preferences: null,
    synced: true,
    last_synced_at: now,
    created_at: now,
    updated_at: now
  };
}

function _getUserByToken(token?: string | null): MockUser | null {
  if (!token) return null;
  const session = state.sessions.find(s => s.token === token);
  if (!session) return null;
  return state.users.find(u => u.id === session.user_id) || null;
}

function normalizeClient(input: Partial<Client>): Client {
  const now = nowIso();
  return {
    id: input.id || generateId('client'),
    name: input.name || 'Unnamed Client',
    email: input.email ?? null,
    phone: input.phone ?? null,
    customer_type: input.customer_type || 'individual',
    address_street: input.address_street ?? null,
    address_city: input.address_city ?? null,
    address_state: input.address_state ?? null,
    address_zip: input.address_zip ?? null,
    address_country: input.address_country ?? null,
    tax_id: input.tax_id ?? null,
    company_name: input.company_name ?? null,
    contact_person: input.contact_person ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? null,
    total_tasks: input.total_tasks ?? 0,
    active_tasks: input.active_tasks ?? 0,
    completed_tasks: input.completed_tasks ?? 0,
    last_task_date: input.last_task_date ?? null,
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    created_by: input.created_by ?? null,
    deleted_at: input.deleted_at ?? null,
    deleted_by: input.deleted_by ?? null,
    synced: input.synced ?? true,
    last_synced_at: input.last_synced_at ?? now
  };
}

function normalizeTask(input: Partial<Task>): Task {
  const now = nowIso();
  return {
    id: input.id || generateId('task'),
    task_number: input.task_number || `TASK-${Math.floor(Math.random() * 9000 + 1000)}`,
    title: input.title || 'Untitled Task',
    description: input.description ?? null,
    vehicle_plate: input.vehicle_plate ?? null,
    vehicle_model: input.vehicle_model ?? null,
    vehicle_year: input.vehicle_year ?? null,
    vehicle_make: input.vehicle_make ?? null,
    vin: input.vin ?? null,
    ppf_zones: input.ppf_zones ?? null,
    custom_ppf_zones: input.custom_ppf_zones ?? null,
    status: input.status || 'pending',
    priority: input.priority || 'medium',
    technician_id: input.technician_id ?? null,
    assigned_at: input.assigned_at ?? null,
    assigned_by: input.assigned_by ?? null,
    scheduled_date: input.scheduled_date ?? null,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    date_rdv: input.date_rdv ?? null,
    heure_rdv: input.heure_rdv ?? null,
    template_id: input.template_id ?? null,
    workflow_id: input.workflow_id ?? null,
    workflow_status: input.workflow_status ?? null,
    current_workflow_step_id: input.current_workflow_step_id ?? null,
    started_at: input.started_at ?? null,
    completed_at: input.completed_at ?? null,
    completed_steps: input.completed_steps ?? null,
    client_id: input.client_id ?? null,
    customer_name: input.customer_name ?? null,
    customer_email: input.customer_email ?? null,
    customer_phone: input.customer_phone ?? null,
    customer_address: input.customer_address ?? null,
    external_id: input.external_id ?? null,
    lot_film: input.lot_film ?? null,
    checklist_completed: input.checklist_completed ?? false,
    notes: input.notes ?? null,
    tags: input.tags ?? null,
    estimated_duration: input.estimated_duration ?? null,
    actual_duration: input.actual_duration ?? null,
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    creator_id: input.creator_id ?? null,
    created_by: input.created_by ?? null,
    updated_by: input.updated_by ?? null,
    deleted_at: input.deleted_at ?? null,
    deleted_by: input.deleted_by ?? null,
    synced: input.synced ?? true,
    last_synced_at: input.last_synced_at ?? now
  };
}

const PPF_STEP_DEFS: Array<{
  step_type: StepType;
  step_name: string;
  description: string;
  min_photos_required: number;
  max_photos_allowed: number;
  estimated_duration_seconds: number;
}> = [
  {
    step_type: 'inspection',
    step_name: 'Inspection',
    description: 'Inspection initiale et photos avant pose',
    min_photos_required: 4,
    max_photos_allowed: 8,
    estimated_duration_seconds: 12 * 60
  },
  {
    step_type: 'preparation',
    step_name: 'Préparation',
    description: 'Nettoyage, dégraissage et découpe film',
    min_photos_required: 0,
    max_photos_allowed: 6,
    estimated_duration_seconds: 18 * 60
  },
  {
    step_type: 'installation',
    step_name: 'Installation',
    description: 'Pose du film PPF zone par zone',
    min_photos_required: 1,
    max_photos_allowed: 12,
    estimated_duration_seconds: 45 * 60
  },
  {
    step_type: 'finalization',
    step_name: 'Finalisation',
    description: 'Contrôle qualité final et photos',
    min_photos_required: 3,
    max_photos_allowed: 8,
    estimated_duration_seconds: 8 * 60
  }
];

function normalizeIntervention(task: Task, overrides: Partial<MockIntervention> = {}): MockIntervention {
  const now = nowIso();
  return {
    id: overrides.id || `intervention-${task.id}`,
    task_id: task.id,
    task_number: task.task_number ?? null,
    status: overrides.status || 'in_progress',
    vehicle_plate: task.vehicle_plate || 'UNKNOWN',
    vehicle_model: task.vehicle_model ?? null,
    vehicle_make: task.vehicle_make ?? null,
    vehicle_year: task.vehicle_year ? Number(task.vehicle_year) : null,
    vehicle_color: null,
    vehicle_vin: task.vin ?? null,
    client_id: task.client_id ?? null,
    client_name: task.customer_name ?? null,
    client_email: task.customer_email ?? null,
    client_phone: task.customer_phone ?? null,
    technician_id: task.technician_id ?? null,
    technician_name: null,
    intervention_type: 'ppf',
    current_step: 0,
    completion_percentage: 0,
    ppf_zones_config: task.ppf_zones ?? null,
    ppf_zones_extended: null,
    film_type: null,
    film_brand: task.lot_film ?? null,
    film_model: null,
    scheduled_at: task.scheduled_date ?? now,
    started_at: now,
    completed_at: null,
    paused_at: null,
    estimated_duration: task.estimated_duration ?? null,
    actual_duration: null,
    weather_condition: null,
    lighting_condition: null,
    work_location: null,
    temperature_celsius: 22,
    humidity_percentage: 45,
    start_location_lat: null,
    start_location_lon: null,
    start_location_accuracy: null,
    end_location_lat: null,
    end_location_lon: null,
    end_location_accuracy: null,
    customer_satisfaction: null,
    quality_score: null,
    final_observations: null,
    customer_signature: null,
    customer_comments: null,
    metadata: null,
    notes: null,
    special_instructions: null,
    device_info: null,
    app_version: 'mock',
    synced: true,
    last_synced_at: now,
    sync_error: null,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function buildInterventionSteps(interventionId: string): MockInterventionStep[] {
  const now = nowIso();
  return PPF_STEP_DEFS.map((def, index) => ({
    id: `${interventionId}-step-${def.step_type}`,
    intervention_id: interventionId,
    step_number: index + 1,
    step_name: def.step_name,
    step_type: def.step_type,
    step_status: index === 0 ? 'in_progress' : 'pending',
    description: def.description,
    instructions: null,
    quality_checkpoints: null,
    is_mandatory: true,
    requires_photos: def.min_photos_required > 0,
    min_photos_required: def.min_photos_required,
    max_photos_allowed: def.max_photos_allowed,
    started_at: index === 0 ? now : null,
    completed_at: null,
    paused_at: null,
    duration_seconds: null,
    estimated_duration_seconds: def.estimated_duration_seconds,
    step_data: null,
    collected_data: null,
    measurements: null,
    observations: null,
    photo_count: 0,
    required_photos_completed: false,
    photo_urls: [],
    validation_data: null,
    validation_errors: null,
    validation_score: null,
    requires_supervisor_approval: false,
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    location_lat: null,
    location_lon: null,
    location_accuracy: null,
    device_timestamp: now,
    server_timestamp: now,
    title: def.step_name,
    notes: null,
    synced: true,
    last_synced_at: now,
    created_at: now,
    updated_at: now
  }));
}

function buildProgress(interventionId: string, steps: MockInterventionStep[]): InterventionProgress {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.step_status === 'completed').length;
  const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const hasInProgress = steps.some(step => step.step_status === 'in_progress');
  const status = completionPercentage >= 100 ? 'completed' : hasInProgress ? 'in_progress' : 'pending';

  return {
    intervention_id: interventionId,
    current_step: completedSteps,
    total_steps: totalSteps,
    completed_steps: completedSteps,
    completion_percentage: completionPercentage,
    estimated_time_remaining: null,
    status
  };
}

function syncInterventionProgress(interventionId: string): void {
  const steps = state.interventionSteps.filter(step => step.intervention_id === interventionId);
  const progress = buildProgress(interventionId, steps);
  const index = state.interventions.findIndex(intervention => intervention.id === interventionId);
  if (index === -1) return;
  const current = state.interventions[index]!;
  state.interventions[index] = {
    ...current,
    current_step: progress.completed_steps,
    completion_percentage: progress.completion_percentage,
    status: progress.status,
    completed_at: progress.status === 'completed' ? nowIso() : current.completed_at,
    updated_at: nowIso()
  } as MockIntervention;
}

state = createState(defaultFixtures);

function normalizeMaterial(input: Partial<Material>): Material {
  const now = nowIso();
  return {
    id: input.id || generateId('material'),
    sku: input.sku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
    name: input.name || 'Material',
    description: input.description ?? null,
    material_type: input.material_type || 'ppf_film',
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    category_id: input.category_id ?? null,
    brand: input.brand ?? null,
    model: input.model ?? null,
    specifications: input.specifications ?? null,
    unit_of_measure: input.unit_of_measure || 'meter',
    current_stock: input.current_stock ?? 0,
    minimum_stock: input.minimum_stock ?? null,
    maximum_stock: input.maximum_stock ?? null,
    reorder_point: input.reorder_point ?? null,
    unit_cost: input.unit_cost ?? null,
    currency: input.currency || 'USD',
    supplier_id: input.supplier_id ?? null,
    supplier_name: input.supplier_name ?? null,
    supplier_sku: input.supplier_sku ?? null,
    quality_grade: input.quality_grade ?? null,
    certification: input.certification ?? null,
    expiry_date: input.expiry_date ?? null,
    batch_number: input.batch_number ?? null,
    serial_numbers: input.serial_numbers ?? null,
    is_active: input.is_active ?? true,
    is_discontinued: input.is_discontinued ?? false,
    is_expired: input.is_expired ?? false,
    is_low_stock: input.is_low_stock ?? false,
    storage_location: input.storage_location ?? null,
    warehouse_id: input.warehouse_id ?? null,
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    created_by: input.created_by ?? null,
    updated_by: input.updated_by ?? null,
    deleted_at: input.deleted_at ?? null,
    deleted_by: input.deleted_by ?? null,
    synced: input.synced ?? true,
    last_synced_at: input.last_synced_at ?? now
  };
}

function inventoryStats(): InventoryStats {
  const total = state.materials.length;
  const active = state.materials.filter(m => m.is_active).length;
  const lowStock = state.materials.filter(m => (m.minimum_stock ?? 0) > (m.current_stock ?? 0)).length;
  const expired = state.materials.filter(m => m.expiry_date).length;
  return {
    total_materials: total,
    active_materials: active,
    low_stock_materials: lowStock,
    expired_materials: expired,
    total_value: state.materials.reduce((sum, m) => sum + (m.unit_cost ?? 0) * (m.current_stock ?? 0), 0),
    materials_by_category: {},
    recent_transactions: [],
    stock_turnover_rate: 0.5,
    average_inventory_age: 30
  };
}

function materialStats(): MaterialStats {
  const total = state.materials.length;
  const active = state.materials.filter(m => m.is_active).length;
  const lowStock = state.materials.filter(m => (m.minimum_stock ?? 0) > (m.current_stock ?? 0)).length;
  const expired = state.materials.filter(m => m.expiry_date).length;
  return {
    total_materials: total,
    active_materials: active,
    low_stock_materials: lowStock,
    expired_materials: expired,
    total_value: state.materials.reduce((sum, m) => sum + (m.unit_cost ?? 0) * (m.current_stock ?? 0), 0),
    materials_by_type: {}
  };
}

export async function handleInvoke(command: string, args?: JsonObject): Promise<unknown> {
  const delay = consumeDelay(command);
  if (delay) {
    await new Promise(resolve => setTimeout(resolve, delay.ms));
  }
  const failure = consumeFailure(command);
  if (failure) {
    throw new Error(failure.message);
  }

  switch (command) {
    case 'auth_login': {
      const request = (args?.request ?? args ?? {}) as AnyRecord;
      const email = request.email;
      const password = request.password;
      const user = state.users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }
      const session = buildSession(user);
      state.sessions = state.sessions.filter(s => s.user_id !== user.id);
      state.sessions.push(session);
      persistSessions(state.sessions);
      return session;
    }
    case 'auth_validate_session': {
      const token = args?.token ?? args?.session_token ?? args?.sessionToken;
      if (state.sessions.length === 0) {
        state.sessions = readPersistedSessions();
      }
      const session = state.sessions.find(s => s.token === token);
      if (!session) {
        throw new Error('Session validation failed');
      }
      return session;
    }
    case 'auth_logout': {
      const token = args?.token ?? args?.session_token ?? args?.sessionToken;
      state.sessions = state.sessions.filter(s => s.token !== token);
      persistSessions(state.sessions);
      return null;
    }
    case 'has_admins': {
      return state.users.some(user => user.role === 'admin');
    }
    case 'bootstrap_first_admin': {
      const request = (args?.request ?? args ?? {}) as AnyRecord;
      const userId = request.user_id ?? request.userId;
      const user = state.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      user.role = 'admin';
      return `User ${userId} promoted to admin`;
    }
    case 'user_crud': {
      const request = (args?.request ?? args ?? {}) as AnyRecord;
      const action = (request.action || {}) as AnyRecord;

      if (action.ChangeRole) {
        const payload = action.ChangeRole as AnyRecord;
        const user = state.users.find(u => u.id === payload.id);
        if (!user) return { type: 'NotFound' };
        user.role = payload.new_role || user.role;
        return toUserAccount(user);
      }

      if (action.ChangePassword) {
        const payload = action.ChangePassword as AnyRecord;
        const user = state.users.find(u => u.id === payload.id);
        if (!user) return { type: 'NotFound' };
        user.password = payload.new_password || user.password;
        return null;
      }

      if (action.Ban || action.Unban) {
        return null;
      }

      switch (action.action) {
        case 'Create': {
          const data = (action.data || {}) as AnyRecord;
          const created: MockUser = {
            id: generateId('user'),
            email: data.email || `${generateId('user')}@example.com`,
            password: data.password || 'password',
            first_name: data.first_name || 'New',
            last_name: data.last_name || 'User',
            role: data.role || 'viewer'
          };
          state.users.push(created);
          return toUserAccount(created);
        }
        case 'Get': {
          const user = state.users.find(u => u.id === action.id);
          return user ? toUserAccount(user) : { type: 'NotFound' };
        }
        case 'List': {
          const limit = Number(action.limit ?? 20);
          const offset = Number(action.offset ?? 0);
          return {
            data: state.users.slice(offset, offset + limit).map(toUserAccount)
          };
        }
        case 'Update': {
          const index = state.users.findIndex(u => u.id === action.id);
          if (index === -1) return { type: 'NotFound' };

          const data = (action.data || {}) as AnyRecord;
          const existingUser = state.users[index]!;
          state.users[index] = {
            ...existingUser,
            email: data.email ?? existingUser.email,
            first_name: data.first_name ?? existingUser.first_name,
            last_name: data.last_name ?? existingUser.last_name,
            role: data.role ?? existingUser.role
          };
          return toUserAccount(state.users[index]!);
        }
        case 'Delete': {
          state.users = state.users.filter(u => u.id !== action.id);
          state.sessions = state.sessions.filter(s => s.user_id !== action.id);
          persistSessions(state.sessions);
          return null;
        }
        default:
          return { type: 'NotFound' };
      }
    }
    case 'client_crud': {
      const request = (args?.request ?? args ?? {}) as AnyRecord;
      const action = (request.action || {}) as AnyRecord;
      switch (action.action) {
        case 'Create': {
          const created = normalizeClient(action.data || {});
          state.clients.push(created);
          return created;
        }
        case 'Get': {
          return state.clients.find(c => c.id === action.id) || { type: 'NotFound' };
        }
        case 'GetWithTasks': {
          return state.clients.find(c => c.id === action.id) || { type: 'NotFound' };
        }
        case 'Update': {
          const index = state.clients.findIndex(c => c.id === action.id);
          if (index === -1) return { type: 'NotFound' };
          state.clients[index] = normalizeClient({ ...state.clients[index], ...action.data, id: action.id, updated_at: nowIso() });
          return state.clients[index];
        }
        case 'Delete': {
          state.clients = state.clients.filter(c => c.id !== action.id);
          return { type: 'Deleted' };
        }
        case 'Search': {
          const query = (action.query || '').toLowerCase();
          return state.clients.filter(c => c.name.toLowerCase().includes(query));
        }
        case 'List': {
          let data = state.clients.filter(c => !c.deleted_at);
          const filters = action.filters || {};
          if (filters.customer_type) {
            data = data.filter(c => c.customer_type === filters.customer_type);
          }
          if (filters.search) {
            const q = filters.search.toLowerCase();
            data = data.filter(c => c.name.toLowerCase().includes(q));
          }
          
          const page = filters.page ?? 1;
          const limit = filters.limit ?? 20;
          const start = (page - 1) * limit;
          const slice = data.slice(start, start + limit);
          return {
            data: {
              data: slice,
              pagination: {
                page,
                limit,
                total: BigInt(data.length),
                total_pages: Math.max(1, Math.ceil(data.length / limit))
              },
              statistics: null
            }
          };
        }
        case 'ListWithTasks': {
          let data = state.clients.filter(c => !c.deleted_at);
          const filters = action.filters || {};
          if (filters.customer_type) {
            data = data.filter(c => c.customer_type === filters.customer_type);
          }
          if (filters.search) {
            const q = filters.search.toLowerCase();
            data = data.filter(c => c.name.toLowerCase().includes(q));
          }
          
          const page = filters.page ?? 1;
          const limit = filters.limit ?? 20;
          const start = (page - 1) * limit;
          const slice = data.slice(start, start + limit);
          
          const results = slice.map(client => ({
            ...client,
            tasks: state.tasks.filter(t => t.client_id === client.id)
          }));

          return {
            data: {
              data: results,
              pagination: {
                page,
                limit,
                total: BigInt(data.length),
                total_pages: Math.max(1, Math.ceil(data.length / limit))
              },
              statistics: null
            }
          };
        }
        case 'Stats': {
          const totalClients = BigInt(state.clients.length);
          const individualClients = BigInt(state.clients.filter(c => c.customer_type === 'individual').length);
          const businessClients = BigInt(state.clients.filter(c => c.customer_type === 'business').length);
          const clientsWithTasks = BigInt(state.clients.filter(c => state.tasks.some(t => t.client_id === c.id)).length);
          const stats: ClientStatistics = {
            total_clients: totalClients,
            individual_clients: individualClients,
            business_clients: businessClients,
            clients_with_tasks: clientsWithTasks,
            new_clients_this_month: BigInt(0)
          };
          return stats;
        }
        default:
          return { type: 'NotFound' };
      }
    }
    case 'task_crud': {
      const request = (args?.request ?? args ?? {}) as AnyRecord;
      const action = (request.action || {}) as AnyRecord;
      switch (action.action) {
        case 'Create': {
          const created = normalizeTask(action.data || {});
          state.tasks.push(created);
          return created;
        }
        case 'Get': {
          return state.tasks.find(t => t.id === action.id) || { type: 'NotFound' };
        }
        case 'Update': {
          const index = state.tasks.findIndex(t => t.id === action.id);
          if (index === -1) return { type: 'NotFound' };
          state.tasks[index] = normalizeTask({ ...state.tasks[index], ...action.data, id: action.id, updated_at: nowIso() });
          return state.tasks[index];
        }
        case 'Delete': {
          state.tasks = state.tasks.filter(t => t.id !== action.id);
          return { type: 'Deleted' };
        }
        case 'List': {
          const page = action.filters?.page ?? 1;
          const limit = action.filters?.limit ?? 20;
          const start = (page - 1) * limit;
          const data = state.tasks.slice(start, start + limit);
          return {
            data,
            pagination: {
              page,
              limit,
              total: BigInt(state.tasks.length),
              total_pages: Math.max(1, Math.ceil(state.tasks.length / limit))
            },
            statistics: null
          };
        }
        case 'GetStatistics': {
          const stats: TaskStatistics = {
            total_tasks: state.tasks.length,
            draft_tasks: state.tasks.filter(t => t.status === 'draft').length,
            scheduled_tasks: state.tasks.filter(t => t.status === 'scheduled').length,
            in_progress_tasks: state.tasks.filter(t => t.status === 'in_progress').length,
            completed_tasks: state.tasks.filter(t => t.status === 'completed').length,
            cancelled_tasks: state.tasks.filter(t => t.status === 'cancelled').length,
            on_hold_tasks: state.tasks.filter(t => t.status === 'on_hold').length,
            pending_tasks: state.tasks.filter(t => t.status === 'pending').length,
            invalid_tasks: state.tasks.filter(t => t.status === 'invalid').length,
            archived_tasks: state.tasks.filter(t => t.status === 'archived').length,
            failed_tasks: state.tasks.filter(t => t.status === 'failed').length,
            overdue_tasks: state.tasks.filter(t => t.status === 'overdue').length,
            assigned_tasks: state.tasks.filter(t => t.status === 'assigned').length,
            paused_tasks: state.tasks.filter(t => t.status === 'paused').length
          };
          return stats;
        }
        default:
          return { type: 'NotFound' };
      }
    }
    case 'document_get_photos': {
      const req = ((args?.request ?? args) ?? {}) as AnyRecord;
      const filtered = state.photos.filter(photo =>
        (!req.intervention_id || photo.intervention_id === req.intervention_id) &&
        (!req.step_id || photo.step_id === req.step_id)
      );
      return { photos: filtered, total: filtered.length };
    }
    case 'document_store_photo': {
      const storeRequest = ((args?.request ?? args) ?? {}) as AnyRecord;
      const now = nowIso();
      const id = generateId('photo');
      const fileName = storeRequest.file_name || `${id}.jpg`;
      const photo = {
        id,
        intervention_id: storeRequest.intervention_id,
        step_id: storeRequest.step_id ?? null,
        step_number: storeRequest.step_number ?? null,
        file_path: `mock://${id}/${fileName}`,
        file_name: fileName,
        file_size: 0,
        mime_type: storeRequest.mime_type || 'image/jpeg',
        width: null,
        height: null,
        photo_type: storeRequest.photo_type ?? null,
        photo_category: null,
        photo_angle: null,
        zone: storeRequest.zone ?? null,
        title: null,
        description: storeRequest.description ?? null,
        notes: null,
        annotations: null,
        gps_location_lat: null,
        gps_location_lon: null,
        gps_location_accuracy: null,
        quality_score: null,
        blur_score: null,
        exposure_score: null,
        composition_score: null,
        is_required: storeRequest.is_required ?? false,
        is_approved: false,
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        synced: true,
        storage_url: null,
        upload_retry_count: 0,
        upload_error: null,
        last_synced_at: null,
        captured_at: null,
        uploaded_at: now,
        created_at: now,
        updated_at: now
      };
      state.photos.push(photo);
      return { photo, file_path: photo.file_path };
    }
    case 'document_delete_photo': {
      const photoId = args?.photo_id as string;
      state.photos = state.photos.filter(photo => photo.id !== photoId);
      return null;
    }
    case 'intervention_workflow': {
      const action = (args?.action || {}) as AnyRecord;
      switch (action.action) {
        case 'Start': {
          const data = (action.data || {}) as AnyRecord;
          const task = state.tasks.find(t => t.id === data.task_id) || normalizeTask({ id: data.task_id });
          const intervention = normalizeIntervention(task, { status: 'in_progress' });
          const steps = buildInterventionSteps(intervention.id);
          state.interventions.push(intervention);
          state.interventionSteps.push(...steps);
          syncInterventionProgress(intervention.id);
          return { type: 'Started', intervention, steps };
        }
        case 'Get': {
          const intervention = state.interventions.find(i => i.id === action.id);
          return intervention ? { type: 'Retrieved', intervention } : { type: 'NotFound' };
        }
        case 'GetActiveByTask': {
          const taskId = action.task_id ?? action.taskId;
          const interventions = state.interventions.filter(
            i => i.task_id === taskId && i.status !== 'completed'
          );
          return { type: 'ActiveByTask', interventions };
        }
        case 'Update': {
          const index = state.interventions.findIndex(i => i.id === action.id);
          if (index === -1) return { type: 'NotFound' };
          state.interventions[index] = {
            ...state.interventions[index],
            ...(action.data || {}),
            updated_at: nowIso()
          };
          return { type: 'Updated', intervention: state.interventions[index] };
        }
        case 'Finalize': {
          const data = (action.data || {}) as AnyRecord;
          const index = state.interventions.findIndex(i => i.id === data.intervention_id);
          if (index === -1) return { type: 'NotFound' };
          const now = nowIso();
          state.interventionSteps = state.interventionSteps.map(step =>
            step.intervention_id === data.intervention_id
              ? { ...step, step_status: 'completed', completed_at: now, updated_at: now }
              : step
          );
          state.interventions[index] = {
            ...state.interventions[index]!,
            status: 'completed',
            completion_percentage: 100,
            current_step: state.interventionSteps.filter(s => s.intervention_id === data.intervention_id).length,
            completed_at: now,
            customer_satisfaction: data.customer_satisfaction ?? null,
            quality_score: data.quality_score ?? null,
            final_observations: data.final_observations ?? null,
            customer_signature: data.customer_signature ?? null,
            customer_comments: data.customer_comments ?? null,
            updated_at: now
          };
          const intervention = state.interventions[index];
          return {
            type: 'Finalized',
            intervention,
            metrics: {
              total_duration_minutes: 60,
              efficiency_score: null,
              quality_score: data.quality_score ?? null,
              certificates_generated: false
            }
          };
        }
        default:
          return { type: 'NotFound' };
      }
    }
    case 'intervention_progress': {
      const action = (args?.action || {}) as AnyRecord;
      switch (action.action) {
        case 'Get': {
          const steps = state.interventionSteps.filter(step => step.intervention_id === action.intervention_id);
          const progress = buildProgress(action.intervention_id, steps);
          return { type: 'Retrieved', progress, steps };
        }
        case 'AdvanceStep': {
          const stepIndex = state.interventionSteps.findIndex(step => step.id === action.step_id);
          if (stepIndex === -1) return { type: 'NotFound' };
          const now = nowIso();
          const step = state.interventionSteps[stepIndex]!;
          const nextPhotos = action.photos ?? step.photo_urls ?? [];
          const updatedStep = {
            ...step,
            collected_data: action.collected_data ?? step.collected_data,
            notes: action.notes ?? step.notes,
            photo_urls: nextPhotos,
            photo_count: nextPhotos.length,
            required_photos_completed: nextPhotos.length >= step.min_photos_required,
            step_status: 'completed',
            completed_at: now,
            updated_at: now
          };
          state.interventionSteps[stepIndex] = updatedStep as MockInterventionStep;
          const nextStepIndex = state.interventionSteps.findIndex(
            s => s.intervention_id === step.intervention_id && s.step_number === step.step_number + 1
          );
          let nextStep: MockInterventionStep | null = null;
          if (nextStepIndex !== -1) {
            const next = state.interventionSteps[nextStepIndex]!;
            nextStep = {
              ...next,
              step_status: next.step_status === 'pending' ? 'in_progress' : next.step_status,
              started_at: next.started_at ?? now,
              updated_at: now
            } as MockInterventionStep;
            state.interventionSteps[nextStepIndex] = nextStep;
          }
          syncInterventionProgress(step.intervention_id);
          const progress = buildProgress(step.intervention_id, state.interventionSteps.filter(s => s.intervention_id === step.intervention_id));
          return { type: 'StepAdvanced', step: updatedStep, next_step: nextStep, progress_percentage: progress.completion_percentage };
        }
        case 'SaveStepProgress': {
          const stepIndex = state.interventionSteps.findIndex(step => step.id === action.step_id);
          if (stepIndex === -1) return { type: 'NotFound' };
          const now = nowIso();
          const step = state.interventionSteps[stepIndex]!;
          const nextPhotos = action.photos ?? step.photo_urls ?? [];
          const updatedStep = {
            ...step,
            collected_data: action.collected_data ?? step.collected_data,
            notes: action.notes ?? step.notes,
            photo_urls: nextPhotos,
            photo_count: nextPhotos.length,
            required_photos_completed: nextPhotos.length >= step.min_photos_required,
            updated_at: now
          };
          state.interventionSteps[stepIndex] = updatedStep as MockInterventionStep;
          return { type: 'StepProgressSaved', step: updatedStep };
        }
        case 'GetStep': {
          const step = state.interventionSteps.find(s => s.id === action.step_id);
          return step ? { type: 'StepRetrieved', step } : { type: 'NotFound' };
        }
        default:
          return { type: 'NotFound' };
      }
    }
    // ── Individual intervention commands (post-refactor) ─────────────────────
    case 'intervention_start': {
      const req = (args?.request ?? {}) as AnyRecord;
      const task = state.tasks.find(t => t.id === req.task_id) || normalizeTask({ id: req.task_id });
      const intervention = normalizeIntervention(task, { status: 'in_progress' });
      const steps = buildInterventionSteps(intervention.id);
      state.interventions.push(intervention);
      state.interventionSteps.push(...steps);
      syncInterventionProgress(intervention.id);
      return { intervention, steps };
    }
    case 'intervention_get': {
      const intervention = state.interventions.find(i => i.id === args?.id);
      return intervention ? { intervention } : null;
    }
    case 'intervention_update': {
      const index = state.interventions.findIndex(i => i.id === args?.id);
      if (index === -1) return null;
      const current = state.interventions[index]!;
      state.interventions[index] = {
        ...current,
        ...((args?.data as AnyRecord) ?? {}),
        updated_at: nowIso()
      } as MockIntervention;
      return { intervention: state.interventions[index] };
    }
    case 'intervention_delete': {
      const idx = state.interventions.findIndex(i => i.id === args?.id);
      if (idx !== -1) state.interventions.splice(idx, 1);
      return null;
    }
    case 'intervention_finalize': {
      const req = (args?.request ?? {}) as AnyRecord;
      const index = state.interventions.findIndex(i => i.id === req.intervention_id);
      if (index === -1) return null;
      const now = nowIso();
      state.interventionSteps = state.interventionSteps.map(step =>
        step.intervention_id === req.intervention_id
          ? { ...step, step_status: 'completed', completed_at: now, updated_at: now }
          : step
      );
      state.interventions[index] = {
        ...state.interventions[index]!,
        status: 'completed',
        completion_percentage: 100,
        completed_at: now,
        customer_satisfaction: req.customer_satisfaction ?? null,
        quality_score: req.quality_score ?? null,
        final_observations: req.final_observations ?? null,
        customer_signature: req.customer_signature ?? null,
        customer_comments: req.customer_comments ?? null,
        updated_at: now
      };
      return {
        intervention: state.interventions[index],
        metrics: {
          total_duration_minutes: 60,
          efficiency_score: null,
          quality_score: req.quality_score ?? null,
          certificates_generated: false
        }
      };
    }
    case 'intervention_advance_step': {
      const stepIndex = state.interventionSteps.findIndex(step => step.id === args?.step_id);
      if (stepIndex === -1) return null;
      const now = nowIso();
      const step = state.interventionSteps[stepIndex]!;
      const nextPhotos = (args?.photos as string[] | undefined) ?? step.photo_urls ?? [];
      const updatedStep = {
        ...step,
        collected_data: args?.collected_data ?? step.collected_data,
        notes: args?.notes ?? step.notes,
        photo_urls: nextPhotos,
        photo_count: nextPhotos.length,
        required_photos_completed: nextPhotos.length >= step.min_photos_required,
        step_status: 'completed',
        completed_at: now,
        updated_at: now
      };
      state.interventionSteps[stepIndex] = updatedStep as MockInterventionStep;
      const nextStepIndex = state.interventionSteps.findIndex(
        s => s.intervention_id === step.intervention_id && s.step_number === step.step_number + 1
      );
      let nextStep: MockInterventionStep | null = null;
      if (nextStepIndex !== -1) {
        const next = state.interventionSteps[nextStepIndex]!;
        nextStep = {
          ...next,
          step_status: next.step_status === 'pending' ? 'in_progress' : next.step_status,
          started_at: next.started_at ?? now,
          updated_at: now
        } as MockInterventionStep;
        state.interventionSteps[nextStepIndex] = nextStep;
      }
      syncInterventionProgress(step.intervention_id);
      const progress = buildProgress(step.intervention_id, state.interventionSteps.filter(s => s.intervention_id === step.intervention_id));
      return { step: updatedStep, next_step: nextStep, progress_percentage: progress.completion_percentage };
    }
    case 'intervention_list': {
      const req = (args?.request ?? {}) as AnyRecord;
      let interventions = [...state.interventions];
      if (req.status) interventions = interventions.filter(i => i.status === req.status);
      if (req.technician_id) interventions = interventions.filter(i => i.technician_id === req.technician_id);
      const limit = typeof req.limit === 'number' ? req.limit : undefined;
      const offset = typeof req.offset === 'number' ? req.offset : 0;
      const paginated = limit !== undefined ? interventions.slice(offset, offset + limit) : interventions.slice(offset);
      return { interventions: paginated, total: interventions.length };
    }
    // ── Individual intervention query commands ────────────────────────────────
    case 'intervention_get_active_by_task': {
      const taskId = args?.task_id ?? args?.taskId;
      const intervention = state.interventions.find(i => i.task_id === taskId && i.status !== 'completed') || null;
      // Return as array to match InterventionWorkflowResponse::ActiveByTask { interventions }
      return { interventions: intervention ? [intervention] : [] };
    }
    case 'intervention_get_latest_by_task': {
      const taskId = args?.task_id ?? args?.taskId;
      // Return intervention directly (ApiResponse<Option<Intervention>> unwrapped by safeInvoke)
      return state.interventions.find(i => i.task_id === taskId) || null;
    }
    case 'intervention_get_progress': {
      const interventionId = (args?.intervention_id ?? '') as string;
      const steps = state.interventionSteps.filter(step => step.intervention_id === interventionId);
      const progress = buildProgress(interventionId, steps);
      // Return { progress, steps } to match interventionsIpc.getProgress expectation
      return { progress, steps };
    }
    case 'intervention_get_step': {
      const stepId = args?.step_id;
      return state.interventionSteps.find(step => step.id === stepId) || null;
    }
    case 'intervention_save_step_progress': {
      // interventionsIpc sends { data: stepData, correlation_id } (not { request: ... })
      const req = (args?.data ?? args?.request ?? {}) as AnyRecord;
      const stepIndex = state.interventionSteps.findIndex(step => step.id === req.step_id);
      if (stepIndex === -1) return null;
      const now = nowIso();
      const step = state.interventionSteps[stepIndex]!;
      const nextPhotos = (req.photos as string[] | undefined) ?? step.photo_urls ?? [];
      const updatedStep = {
        ...step,
        collected_data: req.collected_data ?? step.collected_data,
        notes: req.notes ?? step.notes,
        photo_urls: nextPhotos,
        photo_count: nextPhotos.length,
        required_photos_completed: nextPhotos.length >= step.min_photos_required,
        updated_at: now
      };
      state.interventionSteps[stepIndex] = updatedStep as MockInterventionStep;
      return updatedStep;
    }
    case 'material_list': {
      return state.materials;
    }
    case 'material_get': {
      return state.materials.find(m => m.id === args?.id) || null;
    }
    case 'material_get_by_sku': {
      return state.materials.find(m => m.sku === args?.sku) || null;
    }
    case 'material_create': {
      const request = (args?.request ?? {}) as AnyRecord;
      const created = normalizeMaterial(request);
      if (state.materials.some(m => m.sku === created.sku)) {
        throw new Error('SKU already exists');
      }
      state.materials.push(created);
      return created;
    }
    case 'material_create_category': {
      const request = (args?.request ?? {}) as AnyRecord;
      const category: MaterialCategory = {
        id: generateId('category'),
        name: request.name || 'Category',
        code: request.code ?? null,
        parent_id: request.parent_id ?? null,
        level: request.level ?? 1,
        description: request.description ?? null,
        color: request.color ?? null,
        is_active: request.is_active ?? true,
        created_at: nowIso(),
        updated_at: nowIso(),
        created_by: request.created_by ?? null,
        updated_by: request.updated_by ?? null,
        synced: true,
        last_synced_at: nowIso()
      };
      state.categories.push(category);
      return category;
    }
    case 'material_list_categories': {
      return state.categories;
    }
    case 'material_create_supplier': {
      const request = (args?.request ?? {}) as AnyRecord;
      const supplier: Supplier = {
        id: generateId('supplier'),
        name: request.name || 'Supplier',
        code: request.code,
        contact_person: request.contact_person,
        email: request.email,
        phone: request.phone,
        website: request.website,
        address_street: request.address_street,
        address_city: request.address_city,
        address_state: request.address_state,
        address_zip: request.address_zip,
        address_country: request.address_country,
        tax_id: request.tax_id,
        business_license: request.business_license,
        payment_terms: request.payment_terms,
        lead_time_days: request.lead_time_days ?? 7,
        is_active: request.is_active ?? true,
        is_preferred: request.is_preferred ?? false,
        quality_rating: request.quality_rating,
        delivery_rating: request.delivery_rating,
        on_time_delivery_rate: request.on_time_delivery_rate,
        notes: request.notes,
        special_instructions: request.special_instructions,
        created_at: nowIso(),
        updated_at: nowIso(),
        created_by: request.created_by,
        updated_by: request.updated_by,
        synced: true,
        last_synced_at: nowIso()
      };
      state.suppliers.push(supplier);
      return supplier;
    }
    case 'material_list_suppliers': {
      return state.suppliers;
    }
    case 'material_update': {
      const request = (args?.request ?? {}) as AnyRecord;
      const id = args?.id;
      const index = state.materials.findIndex(m => m.id === id);
      if (index === -1) throw new Error('Material not found');
      state.materials[index] = normalizeMaterial({ ...state.materials[index], ...request, id: id as string, updated_at: nowIso() });
      return state.materials[index];
    }
    case 'material_delete': {
      const id = args?.id;
      state.materials = state.materials.filter(m => m.id !== id);
      return true;
    }
    case 'material_update_stock': {
      const request = (args?.request ?? {}) as AnyRecord;
      const index = state.materials.findIndex(m => m.id === request.material_id);
      if (index === -1) throw new Error('Material not found');
      const existing = state.materials[index]!;
      const newStock = (existing.current_stock ?? 0) + Number(request.quantity || 0);
      state.materials[index] = normalizeMaterial({ ...existing, current_stock: newStock, updated_at: nowIso() });
      return state.materials[index]!;
    }
    case 'material_adjust_stock': {
      const request = (args?.request ?? {}) as AnyRecord;
      const index = state.materials.findIndex(m => m.id === request.material_id);
      if (index === -1) throw new Error('Material not found');
      const existing = state.materials[index]!;
      const newStock = Number(request.new_stock ?? existing.current_stock ?? 0);
      state.materials[index] = normalizeMaterial({ ...existing, current_stock: newStock, updated_at: nowIso() });
      return state.materials[index]!;
    }
    case 'material_record_consumption': {
      const request = (args?.request ?? {}) as AnyRecord;
      const record: MaterialConsumption = {
        id: generateId('consumption'),
        intervention_id: request.intervention_id,
        material_id: request.material_id,
        step_id: request.step_id,
        quantity_used: request.quantity_used || 0,
        unit_cost: request.unit_cost,
        total_cost: request.unit_cost ? request.unit_cost * request.quantity_used : null,
        waste_quantity: request.waste_quantity || 0,
        waste_reason: request.waste_reason,
        batch_used: request.batch_used,
        expiry_used: request.expiry_used,
        quality_notes: request.quality_notes,
        step_number: request.step_number,
        recorded_by: request.recorded_by,
        recorded_at: nowIso(),
        created_at: nowIso(),
        updated_at: nowIso(),
        synced: true,
        last_synced_at: nowIso()
      };
      state.materialConsumptions.push(record);
      return record;
    }
    case 'material_get_intervention_consumption': {
      const interventionId = args?.interventionId;
      return state.materialConsumptions.filter(c => c.intervention_id === interventionId);
    }
    case 'material_get_intervention_summary': {
      const interventionId = args?.interventionId;
      const records = state.materialConsumptions.filter(c => c.intervention_id === interventionId);
      const summary: InterventionMaterialSummary = {
        intervention_id: interventionId as string,
        total_materials_used: records.reduce((sum, r) => sum + r.quantity_used, 0),
        total_cost: records.reduce((sum, r) => sum + (r.total_cost || 0), 0),
        materials: records.map(r => ({
          material_id: r.material_id,
          material_name: state.materials.find(m => m.id === r.material_id)?.name || 'Material',
          material_type: state.materials.find(m => m.id === r.material_id)?.material_type || 'ppf_film',
          quantity_used: r.quantity_used,
          unit_cost: r.unit_cost,
          total_cost: r.total_cost,
          waste_quantity: r.waste_quantity
        }))
      };
      return summary;
    }
    case 'material_get_inventory_movement_summary': {
      return null;
    }
    case 'material_get_stats': {
      return materialStats();
    }
    case 'inventory_get_stats': {
      return inventoryStats();
    }
    case 'material_get_expired_materials': {
      return state.materials.filter(m => Boolean(m.expiry_date));
    }
    case 'material_get_low_stock_materials': {
      return state.materials.filter(m => (m.minimum_stock ?? 0) > (m.current_stock ?? 0));
    }
    case 'dashboard_get_stats': {
      return {
        tasks: { total: state.tasks.length, completed: state.tasks.filter(t => t.status === 'completed').length, pending: 0, active: 0 },
        clients: { total: state.clients.length, active: state.clients.length },
        users: { total: state.users.length, active: state.users.length, admins: state.users.length, technicians: 0 },
        sync: { status: 'idle', pending_operations: 0, completed_operations: 0 }
      };
    }
    case 'sync_get_status': {
      return { status: 'idle', pending_operations: 0, completed_operations: 0 };
    }
    case 'health_check': {
      return 'ok';
    }
    case 'system_health_check': {
      return { db: true, version: '0.1.0' };
    }

    // Individual client commands (used by mock-client.ts via ipcClient)
    case 'client_list': {
      const filters = (args?.filters ?? args?.params ?? {}) as AnyRecord;
      const page = (filters.page as number) ?? 1;
      const limit = (filters.limit as number) ?? 20;
      const search = (filters.search as string | null) ?? null;
      let data = state.clients.filter(c => !c.deleted_at);
      if (search) data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      const start = (page - 1) * limit;
      const slice = data.slice(start, start + limit);
      return {
        data: slice,
        pagination: {
          page,
          limit,
          total: BigInt(data.length),
          total_pages: Math.max(1, Math.ceil(data.length / limit)),
        },
        statistics: null,
      };
    }
    case 'client_get': {
      return state.clients.find(c => c.id === (args?.id as string)) || null;
    }
    case 'client_get_with_tasks': {
      return state.clients.find(c => c.id === (args?.id as string)) || null;
    }
    case 'client_create': {
      const created = normalizeClient((args?.data ?? args ?? {}) as Partial<Client>);
      state.clients.push(created);
      return created;
    }
    case 'client_update': {
      const idx = state.clients.findIndex(c => c.id === (args?.id as string));
      if (idx === -1) return null;
      state.clients[idx] = normalizeClient({ ...state.clients[idx], ...((args?.data ?? {}) as AnyRecord), id: args?.id as string, updated_at: nowIso() });
      return state.clients[idx];
    }
    case 'client_delete': {
      state.clients = state.clients.filter(c => c.id !== (args?.id as string));
      return null;
    }
    case 'client_search': {
      const q = ((args?.query as string) ?? '').toLowerCase();
      const lim = Number(args?.limit ?? 10);
      return state.clients.filter(c => c.name.toLowerCase().includes(q)).slice(0, lim);
    }
    case 'client_get_stats': {
      const totalClients = BigInt(state.clients.filter(c => !c.deleted_at).length);
      const individual = BigInt(state.clients.filter(c => !c.deleted_at && c.customer_type === 'individual').length);
      const business = BigInt(state.clients.filter(c => !c.deleted_at && c.customer_type === 'business').length);
      const withTasks = BigInt(state.clients.filter(c => !c.deleted_at && state.tasks.some(t => t.client_id === c.id)).length);
      return {
        total_clients: totalClients,
        individual_clients: individual,
        business_clients: business,
        clients_with_tasks: withTasks,
        new_clients_this_month: BigInt(0),
      };
    }

    // Individual task commands (used by mock-client.ts via ipcClient)
    case 'task_list': {
      const filter = (args?.filter ?? args?.filters ?? args?.params ?? {}) as AnyRecord;
      const page = (filter.page as number) ?? 1;
      const limit = (filter.limit as number) ?? 20;
      const search = (filter.search as string | null) ?? null;
      let data = state.tasks.filter(t => !t.deleted_at);
      if (search) data = data.filter(t => (t.title ?? '').toLowerCase().includes(search.toLowerCase()));
      if (filter.status) data = data.filter(t => t.status === filter.status);
      const start = (page - 1) * limit;
      return {
        data: data.slice(start, start + limit),
        pagination: {
          page,
          limit,
          total: BigInt(data.length),
          total_pages: Math.max(1, Math.ceil(data.length / limit)),
        },
        statistics: null,
      };
    }
    case 'task_get': {
      return state.tasks.find(t => t.id === (args?.id as string)) || null;
    }
    case 'task_create': {
      const created = normalizeTask((args?.data ?? args ?? {}) as Partial<Task>);
      state.tasks.push(created);
      return created;
    }
    case 'task_update': {
      const idx = state.tasks.findIndex(t => t.id === (args?.id as string));
      if (idx === -1) return null;
      state.tasks[idx] = normalizeTask({ ...state.tasks[idx], ...((args?.data ?? {}) as AnyRecord), id: args?.id as string, updated_at: nowIso() });
      return state.tasks[idx];
    }
    case 'task_delete': {
      state.tasks = state.tasks.filter(t => t.id !== (args?.id as string));
      return null;
    }
    case 'task_statistics': {
      return {
        total_tasks: state.tasks.length,
        draft_tasks: state.tasks.filter(t => t.status === 'draft').length,
        scheduled_tasks: state.tasks.filter(t => t.status === 'scheduled').length,
        in_progress_tasks: state.tasks.filter(t => t.status === 'in_progress').length,
        completed_tasks: state.tasks.filter(t => t.status === 'completed').length,
        cancelled_tasks: state.tasks.filter(t => t.status === 'cancelled').length,
        on_hold_tasks: state.tasks.filter(t => t.status === 'on_hold').length,
        pending_tasks: state.tasks.filter(t => t.status === 'pending').length,
        invalid_tasks: state.tasks.filter(t => t.status === 'invalid').length,
        archived_tasks: state.tasks.filter(t => t.status === 'archived').length,
        failed_tasks: state.tasks.filter(t => t.status === 'failed').length,
        overdue_tasks: state.tasks.filter(t => t.status === 'overdue').length,
        assigned_tasks: state.tasks.filter(t => t.status === 'assigned').length,
        paused_tasks: state.tasks.filter(t => t.status === 'paused').length,
      };
    }

    // System settings (used by settings components)
    case 'get_app_settings':
    case 'system_get_app_settings': {
      return {};
    }
    case 'get_business_hours': {
      return null;
    }
    case 'upload_user_avatar': {
      return '/mock-avatar.png';
    }

    default:
      return null;
  }
}
