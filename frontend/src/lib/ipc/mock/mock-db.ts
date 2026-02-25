import type { UserSession, Task, Client, ClientStatistics, TaskStatistics, UserAccount } from '@/lib/backend';
import type { Material, Supplier, MaterialCategory, InventoryStats, MaterialStats, MaterialConsumption, InterventionMaterialSummary } from '@/shared/types';
import type { JsonObject } from '@/types/json';
import { defaultFixtures, type MockFixtures, type MockUser } from './fixtures';

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
  materials: Material[];
  suppliers: Supplier[];
  categories: MaterialCategory[];
  materialConsumptions: MaterialConsumption[];
}

let state: MockState = createState(defaultFixtures);

const delayNext = new Map<string, DelayEntry>();
const failNext = new Map<string, FailureEntry>();

const nowIso = () => new Date().toISOString();

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
  return {
    users: [...fixtures.users],
    sessions: fixtures.sessions.length > 0 ? [...fixtures.sessions] : persistedSessions,
    clients: [...fixtures.clients],
    tasks: [...fixtures.tasks],
    materials: [...fixtures.materials],
    suppliers: [...fixtures.suppliers],
    categories: [...fixtures.categories],
    materialConsumptions: []
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
    password_hash: 'mock-hash',
    salt: null,
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

function normalizeMaterial(input: Partial<Material>): Material {
  const now = nowIso();
  return {
    id: input.id || generateId('material'),
    sku: input.sku || `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
    name: input.name || 'Material',
    description: input.description,
    material_type: input.material_type || 'ppf_film',
    category: input.category,
    subcategory: input.subcategory,
    category_id: input.category_id,
    brand: input.brand,
    model: input.model,
    specifications: input.specifications,
    unit_of_measure: input.unit_of_measure || 'meter',
    current_stock: input.current_stock ?? 0,
    minimum_stock: input.minimum_stock,
    maximum_stock: input.maximum_stock,
    reorder_point: input.reorder_point,
    unit_cost: input.unit_cost,
    currency: input.currency || 'USD',
    supplier_id: input.supplier_id,
    supplier_name: input.supplier_name,
    supplier_sku: input.supplier_sku,
    quality_grade: input.quality_grade,
    certification: input.certification,
    expiry_date: input.expiry_date,
    batch_number: input.batch_number,
    serial_numbers: input.serial_numbers,
    is_active: input.is_active ?? true,
    is_discontinued: input.is_discontinued ?? false,
    storage_location: input.storage_location,
    warehouse_id: input.warehouse_id,
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    created_by: input.created_by,
    updated_by: input.updated_by,
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

const defaultReportFilters = () => ({
  technician_ids: null,
  client_ids: null,
  statuses: null,
  priorities: null,
  ppf_zones: null,
  vehicle_models: null
});

function buildReportMetadata(title: string) {
  const now = nowIso();
  return {
    title,
    date_range: { start: now, end: now },
    generated_at: now,
    filters: defaultReportFilters(),
    total_records: BigInt(state.tasks.length)
  };
}

function buildTaskCompletionReport() {
  const totalTasks = Math.max(state.tasks.length, 1);
  const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = state.tasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = Math.max(0, totalTasks - completedTasks - inProgressTasks);
  const completionRate = (completedTasks / totalTasks) * 100;
  const today = nowIso().slice(0, 10);

  return {
    metadata: buildReportMetadata('Task Completion Report'),
    summary: {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      completion_rate: completionRate,
      average_duration: 3.2,
      on_time_completion_rate: 84.5
    },
    daily_breakdown: [
      {
        date: today,
        total: totalTasks,
        completed: completedTasks,
        in_progress: inProgressTasks,
        pending: pendingTasks,
        cancelled: 0
      }
    ],
    status_distribution: [
      { status: 'completed', count: completedTasks, percentage: completionRate },
      { status: 'in_progress', count: inProgressTasks, percentage: (inProgressTasks / totalTasks) * 100 },
      { status: 'pending', count: pendingTasks, percentage: (pendingTasks / totalTasks) * 100 }
    ],
    technician_breakdown: [
      {
        technician_id: 'tech-1',
        technician_name: 'Jean Dupont',
        tasks_completed: completedTasks || 1,
        average_time_per_task: 2.6,
        quality_score: 92.4
      }
    ]
  };
}

function buildTechnicianPerformanceReport() {
  return {
    metadata: buildReportMetadata('Technician Performance Report'),
    technicians: [
      {
        id: 'tech-1',
        name: 'Jean Dupont',
        metrics: {
          tasks_completed: 8,
          average_time_per_task: 2.6,
          quality_score: 92.4,
          customer_satisfaction: 4.6,
          utilization_rate: 0.82,
          efficiency_score: 88.2
        },
        trends: [
          { period: 'Week 1', performance_score: 86, tasks_completed: 3 },
          { period: 'Week 2', performance_score: 90, tasks_completed: 5 }
        ]
      },
      {
        id: 'tech-2',
        name: 'Marie Curie',
        metrics: {
          tasks_completed: 6,
          average_time_per_task: 2.9,
          quality_score: 89.1,
          customer_satisfaction: 4.4,
          utilization_rate: 0.76,
          efficiency_score: 84.7
        },
        trends: [
          { period: 'Week 1', performance_score: 82, tasks_completed: 2 },
          { period: 'Week 2', performance_score: 87, tasks_completed: 4 }
        ]
      }
    ],
    benchmarks: {
      top_performer_score: 93.5,
      team_average: 88.6,
      industry_average: 81.2
    },
    trends: [
      { period: 'Week 1', performance_score: 84, tasks_completed: 5 },
      { period: 'Week 2', performance_score: 89, tasks_completed: 9 }
    ]
  };
}

function buildClientAnalyticsReport() {
  const totalClients = Math.max(state.clients.length, 1);
  return {
    metadata: buildReportMetadata('Client Analytics Report'),
    summary: {
      total_clients: totalClients,
      new_clients_this_period: 1,
      returning_clients: Math.max(0, totalClients - 1),
      retention_rate: 78.5,
      average_revenue_per_client: 1250
    },
    retention_analysis: {
      new_client_rate: 0.2,
      repeat_client_rate: 0.65,
      churn_rate: 0.15,
      lifetime_value: 4200
    },
    revenue_analysis: {
      total_revenue: 18000,
      revenue_by_client_type: {
        individual: 7200,
        business: 10800
      },
      average_revenue_per_task: 600,
      revenue_growth_rate: 0.12
    },
    top_clients: [
      {
        id: 'client-1',
        name: 'Client A',
        customer_type: 'individual',
        total_revenue: 2500,
        tasks_completed: 3,
        average_revenue_per_task: 833,
        satisfaction_score: 4.7,
        retention_status: true
      }
    ]
  };
}

function buildQualityComplianceReport() {
  return {
    metadata: buildReportMetadata('Quality Compliance Report'),
    summary: {
      overall_quality_score: 91.2,
      photo_compliance_rate: 88.5,
      step_completion_accuracy: 92.8,
      defect_rate: 3.4
    },
    quality_trends: [
      { date: nowIso().slice(0, 10), quality_score: 90, photo_compliance: 87, step_accuracy: 93 }
    ],
    common_issues: [
      {
        issue_type: 'Photo manquante',
        count: 2,
        percentage: 4,
        severity: 'low',
        recommended_action: 'Rappeler la prise de photos à chaque étape'
      }
    ],
    compliance_metrics: {
      documentation_completeness: 0.92,
      photo_quality_score: 0.88,
      workflow_adherence: 0.9,
      safety_compliance: 0.95
    }
  };
}

function buildMaterialUsageReport() {
  const now = nowIso();
  return {
    metadata: buildReportMetadata('Material Usage Report'),
    summary: {
      total_material_cost: 4200,
      cost_per_task: 350,
      waste_percentage: 8.5,
      inventory_turnover: 0.7
    },
    consumption_breakdown: [
      {
        id: generateId('consumption'),
        intervention_id: 'intervention-1',
        material_id: 'material-1',
        step_id: null,
        quantity_used: 12,
        unit_cost: 15.5,
        total_cost: 186,
        waste_quantity: 1,
        waste_reason: 'Offcut',
        batch_used: 'BATCH-1',
        expiry_used: null,
        quality_notes: null,
        step_number: 2,
        recorded_by: 'tech-1',
        recorded_at: now,
        created_at: now,
        updated_at: now,
        synced: true,
        last_synced_at: now
      }
    ],
    cost_analysis: {
      cost_by_material_type: {
        ppf_film: 3200,
        adhesive: 600,
        tool: 400
      },
      cost_trends: [
        { period: 'Week 1', material_cost: 1200, cost_per_task: 300 },
        { period: 'Week 2', material_cost: 1400, cost_per_task: 350 }
      ],
      supplier_performance: [
        {
          supplier_name: 'Default Supplier',
          material_type: 'ppf_film',
          total_cost: 3200,
          quality_score: 0.92,
          delivery_reliability: 0.95
        }
      ]
    },
    efficiency_metrics: {
      utilization_rate: 0.86,
      waste_reduction_rate: 0.12,
      cost_efficiency_score: 0.89,
      inventory_optimization: 0.78
    }
  };
}

function buildGeographicReport() {
  return {
    metadata: buildReportMetadata('Geographic Report'),
    heat_map_data: [
      { latitude: 45.5, longitude: -73.5, intensity: 0.8, intervention_count: 12 }
    ],
    service_areas: [
      { center_lat: 45.5, center_lon: -73.6, coverage_radius_km: 12, intervention_count: 18, unique_clients: 7 }
    ],
    geographic_stats: {
      total_points: 25,
      unique_locations: 8,
      average_cluster_density: 3.1,
      coverage_area_km2: 120
    }
  };
}

function buildSeasonalReport() {
  return {
    metadata: buildReportMetadata('Seasonal Report'),
    seasonal_patterns: [
      {
        season: 'Summer',
        month: 7,
        average_tasks_per_day: 4.2,
        completion_rate: 88,
        average_duration_minutes: 160,
        common_issue_types: ['Bulle', 'Alignement']
      }
    ],
    weather_correlation: {
      temperature_impact: 0.12,
      precipitation_impact: -0.08,
      wind_impact: -0.02,
      seasonal_adjustment_factor: 1.05
    },
    peak_periods: [
      {
        period_type: 'month',
        period_value: 'July',
        task_volume: 42,
        average_completion_time: 3.1,
        resource_utilization: 0.86
      }
    ],
    performance_trends: [
      { period: 'Q1', performance_score: 84, tasks_completed: 24 },
      { period: 'Q2', performance_score: 89, tasks_completed: 31 }
    ],
    completion_predictions: [
      {
        predicted_duration_minutes: 155,
        confidence_interval: [140, 170],
        factors_influencing: ['Complexité', 'Météo'],
        historical_average: 160,
        prediction_accuracy: 0.82
      }
    ]
  };
}

function buildOperationalIntelligenceReport() {
  return {
    metadata: buildReportMetadata('Operational Intelligence Report'),
    step_bottlenecks: [
      {
        step_number: 2,
        step_name: 'Préparation surface',
        step_type: 'preparation',
        average_duration_minutes: 48,
        median_duration_minutes: 45,
        max_duration_minutes: 90,
        failure_rate: 0.08,
        rework_rate: 0.12,
        pause_rate: 0.06,
        total_occurrences: 14,
        bottleneck_severity: 'medium'
      }
    ],
    intervention_bottlenecks: [
      {
        intervention_id: 'INT-1001',
        task_number: 'TASK-0001',
        technician_name: 'Jean Dupont',
        vehicle_plate: 'TEST-001',
        stuck_at_step: 3,
        time_at_current_step_hours: 4.5,
        total_duration_hours: 7.2,
        estimated_vs_actual_ratio: 1.3,
        priority: 'high'
      }
    ],
    resource_utilization: [
      {
        technician_id: 'tech-1',
        technician_name: 'Jean Dupont',
        active_interventions: 2,
        completed_today: 1,
        average_completion_time_hours: 3.8,
        utilization_percentage: 74,
        workload_distribution: [
          { period: 'Morning', interventions_count: 1, average_duration_hours: 2.1 },
          { period: 'Afternoon', interventions_count: 1, average_duration_hours: 1.7 }
        ]
      }
    ],
    process_efficiency: {
      overall_efficiency_score: 84.6,
      average_step_completion_time: 42,
      step_success_rate: 0.91,
      rework_percentage: 0.09,
      resource_utilization_rate: 0.78,
      bottleneck_impact_score: 0.18
    },
    recommendations: [
      {
        recommendation_type: 'Optimisation du pré-traitement',
        priority: 'medium',
        description: 'Standardiser la préparation pour réduire la variabilité.',
        impact_score: 0.27,
        implementation_effort: 'medium',
        affected_steps: [2, 3],
        affected_technicians: ['tech-1', 'tech-2']
      }
    ]
  };
}

function buildOverviewReport() {
  return {
    task_completion: buildTaskCompletionReport(),
    technician_performance: buildTechnicianPerformanceReport(),
    client_analytics: buildClientAnalyticsReport(),
    quality_compliance: buildQualityComplianceReport(),
    material_usage: buildMaterialUsageReport(),
    geographic: buildGeographicReport(),
    seasonal: buildSeasonalReport(),
    operational_intelligence: buildOperationalIntelligenceReport()
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
          state.users[index] = {
            ...state.users[index],
            email: data.email ?? state.users[index].email,
            first_name: data.first_name ?? state.users[index].first_name,
            last_name: data.last_name ?? state.users[index].last_name,
            role: data.role ?? state.users[index].role
          };
          return toUserAccount(state.users[index]);
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
          const page = action.filters?.page ?? 1;
          const limit = action.filters?.limit ?? 20;
          const start = (page - 1) * limit;
          const data = state.clients.slice(start, start + limit);
          return {
            data: {
              data,
              pagination: {
                page,
                limit,
                total: BigInt(state.clients.length),
                total_pages: Math.max(1, Math.ceil(state.clients.length / limit))
              },
              statistics: null
            }
          };
        }
        case 'ListWithTasks': {
          return state.clients.map(client => ({
            ...client,
            tasks: state.tasks.filter(t => t.client_id === client.id)
          }));
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
        code: request.code,
        level: request.level ?? 1,
        description: request.description,
        color: request.color,
        is_active: request.is_active ?? true,
        created_at: nowIso(),
        updated_at: nowIso(),
        created_by: request.created_by,
        updated_by: request.updated_by,
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
      const existing = state.materials[index];
      const newStock = (existing.current_stock ?? 0) + Number(request.quantity || 0);
      state.materials[index] = normalizeMaterial({ ...existing, current_stock: newStock, updated_at: nowIso() });
      return state.materials[index];
    }
    case 'material_adjust_stock': {
      const request = (args?.request ?? {}) as AnyRecord;
      const index = state.materials.findIndex(m => m.id === request.material_id);
      if (index === -1) throw new Error('Material not found');
      const existing = state.materials[index];
      const newStock = Number(request.new_stock ?? existing.current_stock ?? 0);
      state.materials[index] = normalizeMaterial({ ...existing, current_stock: newStock, updated_at: nowIso() });
      return state.materials[index];
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
        total_cost: request.unit_cost ? request.unit_cost * request.quantity_used : undefined,
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
    case 'material_get_low_stock': {
      return state.materials.filter(m => (m.minimum_stock ?? 0) > (m.current_stock ?? 0));
    }
    case 'material_get_expired':
    case 'material_get_expired_materials': {
      return state.materials.filter(m => Boolean(m.expiry_date));
    }
    case 'material_get_low_stock_materials': {
      return state.materials.filter(m => (m.minimum_stock ?? 0) > (m.current_stock ?? 0));
    }
    case 'get_task_completion_report': {
      return buildTaskCompletionReport();
    }
    case 'get_technician_performance_report': {
      return buildTechnicianPerformanceReport();
    }
    case 'get_client_analytics_report': {
      return buildClientAnalyticsReport();
    }
    case 'get_quality_compliance_report': {
      return buildQualityComplianceReport();
    }
    case 'get_material_usage_report': {
      return buildMaterialUsageReport();
    }
    case 'get_geographic_report': {
      return buildGeographicReport();
    }
    case 'get_seasonal_report': {
      return buildSeasonalReport();
    }
    case 'get_operational_intelligence_report': {
      return buildOperationalIntelligenceReport();
    }
    case 'get_overview_report': {
      return buildOverviewReport();
    }
    case 'export_report_data': {
      const format = args?.format || 'pdf';
      const fileName = `report.${format === 'excel' ? 'xlsx' : format}`;
      const content = format === 'csv' ? 'a,b,c\n1,2,3\n' : 'mock';
      const base64 = typeof btoa !== 'undefined'
        ? btoa(content)
        : Buffer.from(content, 'utf8').toString('base64');
      return {
        download_url: `data:text/plain;base64,${base64}`,
        content: null,
        file_name: fileName,
        format,
        file_size: content.length,
        generated_at: nowIso(),
        expires_at: nowIso()
      };
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
    default:
      return null;
  }
}
