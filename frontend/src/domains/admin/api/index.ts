/**
 * admin Domain - Public API
 */

export { AdminProvider, useAdminContext } from './AdminProvider';
export { useAdminConfiguration } from './useAdminConfiguration';
export { useAdminActions } from './useAdminActions';
export { useSystemHealth } from '../hooks/useSystemHealth';

export { SystemSettingsTab } from '../components/SystemSettingsTab';
export { BusinessRulesTab } from '../components/BusinessRulesTab';
export { SecurityPoliciesTab } from '../components/SecurityPoliciesTab';
export { IntegrationsTab } from '../components/IntegrationsTab';
export { PerformanceTab } from '../components/PerformanceTab';
export { MonitoringTab } from '../components/MonitoringTab';
export { QualityAssuranceDashboard } from '../components/QualityAssuranceDashboard';
export { PhotoDocumentationDashboard } from '../components/PhotoDocumentationDashboard';
export { SecurityDashboard } from '../components/SecurityDashboard';

export type {
  AdminConfiguration,
  AdminBusinessRule,
  AdminConfigurationState,
  UseAdminActionsResult,
} from './types';
