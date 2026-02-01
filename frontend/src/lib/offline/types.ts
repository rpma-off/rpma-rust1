export type OfflineActionType =
  | 'UPDATE_TASK'
  | 'UPLOAD_PHOTO'
  | 'UPDATE_CHECKLIST'
  | 'PHOTO_UPLOAD';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface QueueStatus {
  pending: number;
  failed: number;
  lastSync: number | null;
}