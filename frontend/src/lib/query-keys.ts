// ─── Existing key factories (kept verbatim) ────────────────────────────────

export const interventionKeys = {
  all: ["interventions"],
  byTask: (taskId: string) => [...interventionKeys.all, "task", taskId],
  byTaskData: (taskId: string) => [...interventionKeys.all, "data", taskId],
  steps: (interventionId: string) => [
    ...interventionKeys.all,
    "steps",
    interventionId,
  ],
  activeForTask: (taskId: string) => [
    ...interventionKeys.all,
    "active",
    taskId,
  ],
  ppfWorkflow: (taskId: string) => [
    ...interventionKeys.all,
    "ppf-workflow",
    taskId,
  ],
  ppfIntervention: (taskId: string) => [
    ...interventionKeys.all,
    "ppf-intervention",
    taskId,
  ],
  ppfInterventionSteps: (interventionId: string) => [
    ...interventionKeys.all,
    "ppf-steps",
    interventionId,
  ],
  photos: (interventionId: string) => [
    ...interventionKeys.all,
    "photos",
    interventionId,
  ],
};

export const taskKeys = {
  all: ["tasks"],
  lists: () => [...taskKeys.all, "list"],
  byId: (taskId: string) => [...taskKeys.all, taskId],
  history: (taskId: string) => [...taskKeys.all, taskId, "history"],
};

export const quoteKeys = {
  all: ["quotes"],
  lists: () => [...quoteKeys.all, "list"],
  byId: (quoteId: string) => [...quoteKeys.all, quoteId],
  stats: () => [...quoteKeys.all, "stats"],
  attachments: (quoteId: string) => [...quoteKeys.all, quoteId, "attachments"],
  items: (quoteId: string) => [...quoteKeys.all, quoteId, "items"],
};

export const reportKeys = {
  all: ["reports"],
  byIntervention: (interventionId: string) => [
    "report",
    "byIntervention",
    interventionId,
  ],
  preview: (interventionId: string) => ["report-preview", interventionId],
};

export const notificationKeys = {
  all: ["notifications"],
  lists: () => [...notificationKeys.all, "list"],
  byId: (notificationId: string) => [...notificationKeys.all, notificationId],
};

export const clientKeys = {
  all: ["clients"],
  list: () => [...clientKeys.all, "list"],
  byId: (clientId: string) => [...clientKeys.all, clientId],
  withTasks: (clientId: string) => [...clientKeys.all, clientId, "with-tasks"],
  stats: () => [...clientKeys.all, "stats"],
};

export const inventoryKeys = {
  all: ["inventory"],
  materials: () => [...inventoryKeys.all, "materials"],
  categories: () => [...inventoryKeys.all, "categories"],
  suppliers: () => [...inventoryKeys.all, "suppliers"],
  reports: () => [...inventoryKeys.all, "reports"],
  dashboard: () => [...inventoryKeys.all, "dashboard"],
};

// ─── New key factories ──────────────────────────────────────────────────────

/** Auth / bootstrap query keys */
export const authKeys = {
  all: ["auth"] as const,
  hasAdmins: () => ["hasAdmins"] as const,
};

/** Calendar query keys */
export const calendarKeys = {
  all: ["calendar"] as const,
  events: (filter?: unknown) => ["calendar-events", filter] as const,
};

/** Onboarding query keys */
export const onboardingKeys = {
  all: ["onboarding"] as const,
  status: () => ["onboarding", "status"] as const,
};

/** Organization query keys */
export const organizationKeys = {
  all: ["organization"] as const,
  settings: () => ["organization", "settings"] as const,
};

/** User settings query keys */
export const userSettingsKeys = {
  all: ["user-settings"] as const,
  byUser: (userId: string | undefined) => ["user-settings", userId] as const,
};

/** Dashboard / entity-count query keys */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (timeRange?: string) =>
    [...dashboardKeys.all, "stats", timeRange] as const,
  recentActivity: (limit?: number) =>
    [...dashboardKeys.all, "recent-activity", limit] as const,
  entityCounts: () => [...dashboardKeys.all, "entity-counts"] as const,
};

/** Admin domain query keys */
export const adminKeys = {
  all: ["admin"] as const,
  /** All user list queries (use as invalidation prefix) */
  users: () => [...adminKeys.all, "users"] as const,
  /** Parameterised user list for targeted cache entries */
  usersFiltered: (search?: string, role?: string) =>
    [...adminKeys.users(), search ?? "", role ?? ""] as const,
  /** App-wide configuration/settings loaded by admin hooks */
  appSettings: () => [...adminKeys.all, "app-settings"] as const,
  /** Admin-scoped dashboard stats */
  dashboard: () => [...adminKeys.all, "dashboard"] as const,
  /** Security: audit metrics */
  securityMetrics: () => [...adminKeys.all, "security", "metrics"] as const,
  /** Security: audit alerts */
  securityAlerts: () => [...adminKeys.all, "security", "alerts"] as const,
  /** Active sessions for the security panel */
  sessions: () => [...adminKeys.all, "sessions"] as const,
  /** System-level configurations (AdminConfiguration[]) */
  configuration: (category?: string) =>
    [...adminKeys.all, "configuration", category ?? ""] as const,
};
