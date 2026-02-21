import { BaseService } from '@/lib/services/core/base.service';
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';

export interface TaskPhoto {
  id: string;
  task_id: string;
  photo_type: 'before' | 'after' | 'during';
  step_id?: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  url: string;
  description?: string;
  taken_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskPhotoQueryParams {
  task_id?: string;
  type?: 'before' | 'after' | 'during';
  step_id?: string;
  uploaded_after?: string;
  uploaded_before?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTaskPhotoData {
  task_id: string;
  photo_type: 'before' | 'after' | 'during';
  step_id?: string;
  file: File;
  description?: string;
}

export interface TaskPhotoUploadResult {
  success: boolean;
  photo?: TaskPhoto;
  error?: string;
}

export class TaskPhotoService extends BaseService {
  private static async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  private static mapPhotoResponse(raw: Record<string, unknown>): TaskPhoto {
    return {
      id: String(raw.id || ''),
      task_id: String(raw.task_id || raw.intervention_id || ''),
      photo_type: (raw.photo_type as TaskPhoto['photo_type']) || 'during',
      step_id: raw.step_id ? String(raw.step_id) : undefined,
      file_path: String(raw.file_path || raw.file_name || ''),
      file_size: typeof raw.file_size === 'number' ? raw.file_size : 0,
      mime_type: String(raw.mime_type || 'image/jpeg'),
      url: String(raw.file_path || raw.url || ''),
      description: raw.description ? String(raw.description) : undefined,
      taken_at: raw.taken_at ? String(raw.taken_at) : undefined,
      created_at: String(raw.created_at || new Date().toISOString()),
      updated_at: String(raw.updated_at || new Date().toISOString()),
    };
  }

  static async getPhotos(params: TaskPhotoQueryParams): Promise<{ data: TaskPhoto[]; error: null } | { data: null; error: Error }> {
    try {
      if (!params.task_id) {
        return { data: [], error: null };
      }

      const token = await this.getSessionToken();
      const photos = await ipcClient.photos.list(params.task_id, token);

      const mapped = (photos as unknown as Array<Record<string, unknown>>).map(p =>
        this.mapPhotoResponse(p)
      );

      return {
        data: mapped,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get photos')
      };
    }
  }

  static async createTaskPhoto(data: CreateTaskPhotoData): Promise<{ data: TaskPhoto; error: null } | { data: null; error: Error }> {
    try {
      const token = await this.getSessionToken();
      const result = await ipcClient.photos.upload(
        data.task_id,
        data.file.name,
        data.photo_type,
        token
      );

      const raw = result as unknown as Record<string, unknown>;
      const photo = this.mapPhotoResponse({ ...raw, task_id: data.task_id, step_id: data.step_id, description: data.description });

      return {
        data: photo,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create photo')
      };
    }
  }

  static async uploadPhoto(
    file: File,
    taskId: string,
    type: 'before' | 'after' | 'during',
    options?: { description?: string; stepId?: string; gpsLocation?: { latitude: number; longitude: number; accuracy?: number } }
  ): Promise<TaskPhotoUploadResult> {
    try {
      const result = await this.createTaskPhoto({
        task_id: taskId,
        photo_type: type,
        step_id: options?.stepId,
        file,
        description: options?.description,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return {
        success: true,
        photo: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }
}

export const taskPhotoService = TaskPhotoService;
