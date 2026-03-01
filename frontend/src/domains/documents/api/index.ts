/**
 * documents Domain - Public API
 */

export { DocumentsProvider, useDocumentsDomainContext } from './DocumentsProvider';
export { usePhotoUpload } from '../hooks/usePhotoUpload';
export { default as PhotoUpload } from '../components/PhotoUpload';

export { TaskPhotoService, taskPhotoService } from '../services';
export type { TaskPhoto, TaskPhotoQueryParams, CreateTaskPhotoData, TaskPhotoUploadResult } from '../services';

export type { DocumentsDomainContextValue } from './types';
