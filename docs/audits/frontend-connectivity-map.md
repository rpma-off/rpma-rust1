# Frontend Connectivity Map

Static connectivity scan across `frontend/src/app/**/page.tsx`.

| Route | Component | Action | Handler | Backend call (command) | Status (OK/MISSING/MOCK/DEAD) | Notes |
|---|---|---|---|---|---|---|
| `/admin` | `AdminPage` | `N/A` | `N/A` | `ipcClient.dashboard.getStats, ipcClient.system.healthCheck, ipcClient.system.getDatabaseStats` | **OK** | No explicit JSX handler in page file |
| `/analytics` | `AnalyticsPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/audit` | `AuditPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/bootstrap-admin` | `BootstrapAdminPage` | `onSubmit` | `handleSubmit` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/[id]/edit` | `EditClientPage` | `onSubmit` | `handleSubmit` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/[id]/edit` | `EditClientPage` | `onClick` | `handleCancel` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/[id]` | `ClientDetailPage` | `onClick` | `handleCreateTask` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/[id]` | `ClientDetailPage` | `onClick` | `handleEdit` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/[id]` | `ClientDetailPage` | `onClick` | `handleDelete` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/new` | `NewClientPage` | `onSubmit` | `handleSubmit` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients/new` | `NewClientPage` | `onClick` | `handleCancel` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/clients` | `ClientsPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/configuration` | `ConfigurationPage` | `onClick` | `handleRefresh` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/dashboard/interventions` | `InterventionsDashboard` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/dashboard/operational-intelligence` | `OperationalIntelligencePage` | `onClick` | `handleRefresh` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/dashboard/operational-intelligence` | `OperationalIntelligencePage` | `onClick` | `handleExport` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/dashboard` | `DashboardPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/data-explorer` | `DataExplorerPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/interventions` | `InterventionsPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/inventory` | `InventoryPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/login` | `LoginPage` | `onSubmit` | `handleSubmit` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/login` | `LoginPage` | `onChange` | `handleChange` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/messages` | `MessagesPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/` | `Home` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/reports` | `Reports` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/schedule` | `SchedulePage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/settings` | `SettingsPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/signup` | `SignupPage` | `onSubmit` | `handleSubmit` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/signup` | `SignupPage` | `onChange` | `handleChange` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/signup` | `SignupPage` | `onChange` | `handlePasswordValidationChange` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/tasks/[id]/completed` | `TaskCompletedPage` | `onClick` | `handleSaveReport` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/tasks/[id]/completed` | `TaskCompletedPage` | `onClick` | `handleShareTask` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/tasks/[id]/completed` | `TaskCompletedPage` | `onClick` | `handlePrintReport` | `-` | **DEAD** | Placeholder/local-only behavior detected |
| `/tasks/[id]` | `TaskDetailPage` | `N/A` | `N/A` | `ipcClient.tasks.checkTaskAssignment, ipcClient.tasks.checkTaskAvailability` | **OK** | No explicit JSX handler in page file |
| `/tasks/[id]/workflow/ppf` | `PPFWorkflowPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/tasks/[id]/workflow/ppf/steps/finalization` | `FinalizationStepPage` | `onClick` | `handleCompleteFinalization` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/tasks/[id]/workflow/ppf/steps/inspection` | `InspectionStepPage` | `onClick` | `handleCompleteInspection` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/tasks/[id]/workflow/ppf/steps/installation` | `InstallationStepPage` | `onClick` | `handleCompleteInstallation` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/tasks/[id]/workflow/ppf/steps/preparation` | `PreparationStepPage` | `onClick` | `handleCompletePreparation` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/tasks/[id]/workflow/steps/[step]` | `WorkflowStepRedirect` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/tasks/edit/[id]` | `EditTaskPage` | `onClick` | `handleCancel` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/tasks/new` | `NewTaskPage` | `onClick` | `handleCancel` | `-` | **MISSING** | No IPC/API call detected in handler segment |
| `/tasks` | `TasksPage` | `onClick` | `onImport` | `-` | **MISSING** | Handler delegated to child component or prop |
| `/tasks` | `TasksPage` | `onClick` | `onExport` | `-` | **MISSING** | Handler delegated to child component or prop |
| `/tasks` | `TasksPage` | `onClick` | `handleExport` | `-` | **MISSING** | Handler delegated to child component or prop |
| `/team` | `TeamPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/technicians` | `TechniciansPage` | `N/A` | `N/A` | `ipcClient.users.list` | **OK** | No explicit JSX handler in page file |
| `/unauthorized` | `UnauthorizedPage` | `N/A` | `N/A` | `-` | **MISSING** | No explicit JSX handler in page file |
| `/users` | `UsersPage` | `onClick` | `handleCreateUser` | `-` | **MISSING** | No IPC/API call detected in handler segment |
