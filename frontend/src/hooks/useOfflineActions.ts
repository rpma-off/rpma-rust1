import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { taskApiService } from '@/lib/services/api/task.api.service';
import { taskPhotoService } from '@/lib/services';

import { UpdateTaskData } from '@/lib/services/core/schemas';
import { TaskWithDetails } from '@/types/task.types';

type UpdateTaskPayload = {
  taskId: string;
  updates: UpdateTaskData;
};

type UploadPhotoPayload = {
  taskId: string;
  file: File;
  type: string;
};

type UpdateChecklistPayload = {
  itemId: string;
  updates: Record<string, unknown>;
};

type OfflineActionPayload = UpdateTaskPayload | UploadPhotoPayload | UpdateChecklistPayload;

type OfflineAction = {
  id: string;
  type: 'UPDATE_TASK' | 'UPLOAD_PHOTO' | 'UPDATE_CHECKLIST';
  payload: OfflineActionPayload;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
};

const OFFLINE_ACTIONS_KEY = 'offline_actions';
const MAX_RETRIES = 3;

export const useOfflineActions = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [actions, setActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load actions from localStorage on mount
  useEffect(() => {
    const savedActions = localStorage.getItem(OFFLINE_ACTIONS_KEY);
    if (savedActions) {
      setActions(JSON.parse(savedActions));
    }

    // Set up online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save actions to localStorage whenever they change
  useEffect(() => {
    if (actions.length > 0) {
      localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
    } else {
      localStorage.removeItem(OFFLINE_ACTIONS_KEY);
    }
  }, [actions]);

  // Process pending actions when coming back online
  useEffect(() => {
    if (isOnline && actions.some(a => a.status === 'pending')) {
      processPendingActions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, actions]);

  const addAction = (type: OfflineAction['type'], payload: OfflineActionPayload) => {
    const newAction: OfflineAction = {
      id: uuidv4(),
      type,
      payload,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    setActions(prev => [...prev, newAction]);
    
    if (isOnline) {
      processAction(newAction);
    }

    return newAction.id;
  };

  const processAction = async (action: OfflineAction) => {
    if (action.status === 'completed' || action.status === 'processing') return;

    setActions(prev => 
      prev.map(a => 
        a.id === action.id 
          ? { ...a, status: 'processing', lastError: undefined }
          : a
      )
    );

    try {
      switch (action.type) {
        case 'UPDATE_TASK':
          await updateTask(action.payload as UpdateTaskPayload);
          break;
        case 'UPLOAD_PHOTO':
          await uploadPhoto(action.payload as UploadPhotoPayload);
          break;
        case 'UPDATE_CHECKLIST':
          await updateChecklist(action.payload as UpdateChecklistPayload);
          break;
      }

      // Mark as completed
      setActions(prev => 
        prev.map(a => 
          a.id === action.id 
            ? { ...a, status: 'completed' }
            : a
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (action.retryCount >= MAX_RETRIES) {
        // Mark as failed after max retries
        setActions(prev => 
          prev.map(a => 
            a.id === action.id 
              ? { 
                  ...a, 
                  status: 'failed', 
                  lastError: errorMessage,
                  retryCount: a.retryCount + 1
                }
              : a
          )
        );
      } else {
        // Retry with exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, action.retryCount), 30000);
        
        setTimeout(() => {
          processAction(action);
        }, backoffTime);

        setActions(prev => 
          prev.map(a => 
            a.id === action.id 
              ? { 
                  ...a, 
                  status: 'pending',
                  lastError: errorMessage,
                  retryCount: a.retryCount + 1
                }
              : a
          )
        );
      }
    }
  };

  const processPendingActions = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    const pendingActions = actions.filter(a => a.status === 'pending');
    
    for (const action of pendingActions) {
      await processAction(action);
    }
    
    setIsSyncing(false);
  };

  // Implementation of action handlers
  const updateTask = async (payload: OfflineActionPayload) => {
    if ('taskId' in payload && 'updates' in payload && !('file' in payload)) {
      const { taskId, updates } = payload as UpdateTaskPayload;

      // Status and priority are already string literals that match the union types
      const convertedUpdates: Partial<TaskWithDetails> = {
        ...updates,
      };

      const response = await taskApiService.updateTask(taskId, convertedUpdates);

      if (response.error) {
        let errorMessage = 'Failed to update task';
        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (response.error && typeof response.error === 'object' && 'message' in response.error) {
          errorMessage = (response.error as { message: string }).message;
        }
        throw new Error(errorMessage);
      }
    } else {
      throw new Error('Invalid payload for UPDATE_TASK');
    }
  };

  const uploadPhoto = async (payload: OfflineActionPayload) => {
    if ('taskId' in payload && 'file' in payload && 'type' in payload) {
      const { taskId, file, type } = payload as UploadPhotoPayload;

      const response = await taskPhotoService.uploadPhoto(file as File, taskId, type as 'before' | 'after' | 'during');

      if (response.error) {
        let errorMessage = 'Failed to upload photo';
        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (response.error && typeof response.error === 'object' && 'message' in response.error) {
          errorMessage = (response.error as { message: string }).message;
        }
        throw new Error(errorMessage);
      }
    } else {
      throw new Error('Invalid payload for UPLOAD_PHOTO');
    }
  };

  const updateChecklist = async (payload: OfflineActionPayload) => {
    if ('itemId' in payload && 'updates' in payload && !('file' in payload)) {
      const { itemId: _itemId, updates: _updates } = payload as UpdateChecklistPayload;
      // Note: We would need a checklistService here - for now using a placeholder
      // This should be updated when checklist service is available in the centralized services
      throw new Error('Checklist update not yet migrated to centralized services');
    } else {
      throw new Error('Invalid payload for UPDATE_CHECKLIST');
    }
  };

  const clearCompletedActions = () => {
    setActions(prev => prev.filter(a => a.status !== 'completed'));
  };

  return {
    isOnline,
    isSyncing,
    pendingActions: actions.filter(a => a.status !== 'completed'),
    addAction,
    processPendingActions,
    clearCompletedActions
  };
};
