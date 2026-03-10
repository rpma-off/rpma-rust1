// Public API surface for the reports domain.
// All cross-domain imports must go through this file.
/** TODO: document */
export { ReportsProvider, useReportsContext } from './ReportsProvider';
/** TODO: document */
export type { ReportsContextValue } from './ReportsProvider';
/** TODO: document */
export { reportsIpc } from '../ipc';
/** TODO: document */
export { useInterventionReport, useInterventionReportPreview } from '../hooks';
/** TODO: document */
export { InterventionReportSection, ReportPreviewPanel } from '../components';
/** TODO: document */
export type { InterventionReportViewModel, ReportStepViewModel } from '../services';
