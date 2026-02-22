import { useState, useEffect, useCallback } from 'react';
import { documentsIpc } from '../ipc';
import { useAuth } from '@/domains/auth';
import type { Photo } from '@/lib/ipc/types/index';

export interface UsePhotosOptions {
  interventionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function usePhotos(options: UsePhotosOptions = {}) {
  const { interventionId, autoRefresh = false, refreshInterval = 30000 } = options;
  const { user } = useAuth();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!interventionId || !user?.token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await documentsIpc.listPhotos(interventionId, user.token);
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch photos');
    } finally {
      setLoading(false);
    }
  }, [interventionId, user?.token]);

  const uploadPhoto = useCallback(async (
    filePath: string,
    photoType: string
  ): Promise<Photo | null> => {
    if (!interventionId || !user?.token) return null;

    try {
      setLoading(true);
      setError(null);
      const photo = await documentsIpc.uploadPhoto(interventionId, filePath, photoType, user.token);
      setPhotos(prev => [...prev, photo]);
      return photo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [interventionId, user?.token]);

  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    if (!user?.token) return false;

    try {
      setLoading(true);
      setError(null);
      await documentsIpc.deletePhoto(photoId, user.token);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  const getPhoto = useCallback(async (photoId: string): Promise<Photo | null> => {
    if (!user?.token) return null;

    try {
      const photo = await documentsIpc.getPhoto(photoId, user.token);
      return photo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get photo');
      return null;
    }
  }, [user?.token]);

  useEffect(() => {
    fetchPhotos();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchPhotos, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPhotos, autoRefresh, refreshInterval]);

  return {
    photos,
    loading,
    error,
    refetch: fetchPhotos,
    uploadPhoto,
    deletePhoto,
    getPhoto,
  };
}
