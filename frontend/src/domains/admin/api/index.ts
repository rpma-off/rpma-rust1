/**
 * admin Domain - Public API
 */

export { AdminProvider, useAdminContext } from './AdminProvider';
/** TODO: document */
export { useAdminConfiguration } from './useAdminConfiguration';
/** TODO: document */
export { useAdminActions } from './useAdminActions';
/** TODO: document */
export { useSystemHealth } from '../hooks/useSystemHealth';
/** TODO: document */
export { useAdminDashboard } from '../hooks/useAdminDashboard';
/** TODO: document */
export type { SystemStats, RecentActivity, UseAdminDashboardReturn } from '../hooks/useAdminDashboard';
/** TODO: document */
export { useAdminUserManagement } from '../hooks/useAdminUserManagement';
/** TODO: document */
export type { UseAdminUserManagementReturn } from '../hooks/useAdminUserManagement';
/** TODO: document */
export { useAdminPage } from '../hooks/useAdminPage';

/** TODO: document */
export { SystemSettingsTab } from '../components/SystemSettingsTab';
/** TODO: document */
export { BusinessRulesTab } from '../components/BusinessRulesTab';
/** TODO: document */
export { SecurityPoliciesTab } from '../components/SecurityPoliciesTab';
/** TODO: document */
export { IntegrationsTab } from '../components/IntegrationsTab';
/** TODO: document */
export { PerformanceTab } from '../components/PerformanceTab';
/** TODO: document */
export { MonitoringTab } from '../components/MonitoringTab';
/** TODO: document */
export { SecurityDashboard } from '../components/SecurityDashboard';
/** TODO: document */
export { default as ConfigurationPageContent } from '../components/ConfigurationPageContent';
/** TODO: document */
export { AdminOverviewTab } from '../components/AdminOverviewTab';
/** TODO: document */
export { AdminUsersTab } from '../components/AdminUsersTab';
/** TODO: document */
export { AdminSystemTab } from '../components/AdminSystemTab';
/** TODO: document */
export { AddUserModal } from '../components/AddUserModal';

/** TODO: document */
export type {
  AdminConfiguration,
  AdminBusinessRule,
  AdminConfigurationState,
  UseAdminActionsResult,
} from './types';
