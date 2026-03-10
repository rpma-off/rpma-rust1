/**
 * documents Domain - Public API
 */

export { DocumentsProvider, useDocumentsDomainContext } from './DocumentsProvider';
/** TODO: document */
export { usePhotoUpload } from '../hooks/usePhotoUpload';
/** TODO: document */
export { default as PhotoUpload } from '../components/PhotoUpload';

/** TODO: document */
export { TaskPhotoService, taskPhotoService } from '../services';
/** TODO: document */
export type { TaskPhoto, TaskPhotoQueryParams, CreateTaskPhotoData, TaskPhotoUploadResult } from '../services';
/** TODO: document */
export { documentReportOperations } from '../server';
/** TODO: document */
export type { InterventionReportResult } from '../server';

/** TODO: document */
export type { DocumentsDomainContextValue } from './types';
