import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { taskService } from '@/domains/tasks/server';

export interface AutoSaveOptions<T = Record<string, unknown>> {
  delay?: number; // DÃ©lai en ms avant sauvegarde (dÃ©faut: 30s)
  enabled?: boolean; // Activer/dÃ©sactiver l'auto-save
  onSave?: (data: T) => void; // Callback de succÃ¨s
  onError?: (error: Error) => void; // Callback d'erreur
  immediate?: boolean; // Sauvegarder immÃ©diatement sur changement
}

export interface AutoSaveStatus {
  saving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions<T> = {}
) {
  const {
    delay = 30000, // 30 secondes par dÃ©faut
    enabled = true,
    onSave,
    onError,
    immediate = false
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>({
    saving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);
  const saveInProgressRef = useRef(false);

  const performSave = useCallback(async (currentData: T) => {
    if (saveInProgressRef.current || !enabled) return;

    try {
      saveInProgressRef.current = true;
      setStatus(prev => ({ 
        ...prev, 
        saving: true, 
        error: null 
      }));

      await saveFunction(currentData);

      setStatus(prev => ({
        ...prev,
        saving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      }));

      onSave?.(currentData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de sauvegarde';
      
      setStatus(prev => ({
        ...prev,
        saving: false,
        error: errorMessage
      }));

      onError?.(error instanceof Error ? error : new Error(errorMessage));
      toast.error(`Auto-save Ã©chec: ${errorMessage}`);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [enabled, saveFunction, onSave, onError]);

  // Fonction pour forcer une sauvegarde manuelle
  const forceSave = async () => {
    await performSave(data);
  };

  // Effet principal pour gÃ©rer l'auto-save
  useEffect(() => {
    // VÃ©rifier si les donnÃ©es ont changÃ©
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    
    if (!hasChanged) return;

    // Marquer comme ayant des changements non sauvÃ©s
    setStatus(prev => ({ 
      ...prev, 
      hasUnsavedChanges: true,
      error: null 
    }));

    // Sauvegarder immÃ©diatement si demandÃ©
    if (immediate) {
      performSave(data);
      previousDataRef.current = data;
      return;
    }

    // Nettoyer le timeout prÃ©cÃ©dent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Programmer la sauvegarde diffÃ©rÃ©e
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        performSave(data);
      }, delay);
    }

    // Mettre Ã  jour la rÃ©fÃ©rence des donnÃ©es prÃ©cÃ©dentes
    previousDataRef.current = data;

  }, [data, delay, enabled, immediate, performSave]);

  // Nettoyer le timeout au dÃ©montage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...status,
    forceSave
  };
}

// Hook spÃ©cialisÃ© pour les Ã©tapes de workflow
export function useWorkflowStepAutoSave(
  stepData: Record<string, unknown>,
  taskId: string,
  stepId: string,
  options: Omit<AutoSaveOptions<Record<string, unknown>>, 'delay'> & { delay?: number } = {}
) {
  const saveStepData = async (data: Record<string, unknown>) => {
    const result = await taskService.updateTaskStepData(taskId, stepId, {
      ...data,
      updated_at: new Date().toISOString()
    });

    if (!result.success) {
      throw new Error(`Erreur sauvegarde Ã©tape: ${result.error ?? 'Erreur inconnue'}`);
    }
  };

  return useAutoSave(stepData, saveStepData, {
    delay: 30000, // 30s pour les Ã©tapes workflow
    onSave: (data) => {
      toast.success('Ã‰tape sauvegardÃ©e automatiquement', {
        duration: 2000,
        description: `${stepId} - ${new Date().toLocaleTimeString()}`
      });
      options.onSave?.(data);
    },
    onError: (error) => {
      console.error('Workflow step auto-save error:', error);
      options.onError?.(error);
    },
    ...options
  });
}
// Hook pour sauvegarder avant fermeture de page
export function useBeforeUnloadSave<T>(
  data: T,
  hasUnsavedChanges: boolean,
  saveFunction: (data: T) => Promise<void>
) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Tenter une sauvegarde synchrone rapide si possible
        try {
          // Note: navigator.sendBeacon pourrait Ãªtre utilisÃ© ici pour une sauvegarde plus fiable
          saveFunction(data);
        } catch (error) {
          console.error('Emergency save failed:', error);
        }

        // Afficher la confirmation de fermeture
        const message = 'Vous avez des modifications non sauvegardÃ©es. Voulez-vous vraiment quitter ?';
        event.returnValue = message;
        return message;
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [data, hasUnsavedChanges, saveFunction]);
}



