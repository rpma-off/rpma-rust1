// Types (still used by new dashboard implementation)
export * from './types';

// Components still in use
export { DiagnosticsPanel } from './diagnostics-panel';

// Legacy components (kept for backward compatibility)
// These are no longer used by the main dashboard but kept for other potential uses
export { default as Dashboard } from '../components/dashboard/Dashboard';
export { Dashboard as DashboardComponent } from '../components/dashboard/Dashboard';
export { DashboardHeader } from './DashboardHeader';
export { DashboardSection } from './DashboardSection';
export { DashboardWidget } from './DashboardWidget';

// Re-export for backward compatibility
export { Dashboard as EnhancedDashboard } from '../components/dashboard/Dashboard';
export { Dashboard as TaskDashboard } from '../components/dashboard/Dashboard';
