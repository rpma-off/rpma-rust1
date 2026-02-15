import { BaseService } from '../core/base.service';

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
  static async getPhotos(_params: TaskPhotoQueryParams): Promise<{ data: TaskPhoto[]; error: null } | { data: null; error: Error }> {
    try {
      // Mock implementation - in real app this would query the database
      return {
        data: [],
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
      // Mock implementation - in real app this would save to database and upload file
      const photo: TaskPhoto = {
        id: 'photo-' + Date.now(),
        task_id: data.task_id,
        photo_type: data.photo_type,
        step_id: data.step_id,
        file_path: `photos/${data.task_id}/${Date.now()}-${data.file.name}`,
        file_size: data.file.size,
        mime_type: data.file.type,
        url: `https://example.com/photos/${data.task_id}/${Date.now()}-${data.file.name}`,
        description: data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

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
