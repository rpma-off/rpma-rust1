import { useMemo, useCallback, useRef, useState } from 'react';
import { TaskWithDetails, ChecklistItem } from '@/types/task.types';
import { Task } from '@/types';
import { convertTimestamps } from '@/lib/types';

interface TaskDisplay {
  id: string;
  title: string;
  vehicle_plate: string;
  vehicle_model: string;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vin: string | null;
  date_rdv: string | null;
  heure_rdv: string | null;
  lot_film: string | null;
  note: string | null;
  photos_before: unknown[];
  photos_after: unknown[];
   checklist_items: ChecklistItem[];
  status: string;
   ppf_zones: string[];
  is_available: boolean;
  technician_id: string | null;
  assigned_at: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  workflow_status: string | null;
  photos: unknown;
  checklist_completed: boolean;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  description: string;
  location: string | null;
  workflow_id: string | null;
  current_workflow_step_id: string | null;
  creator_id: string | null;
  checklist_id: string | null;
  external_id: string | null;
  task_number: string | null;
  template_id: string | null;
  started_at: string | null;
  completed_steps: unknown;
  custom_ppf_zones: string[];
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  scheduled_at: string | null;
}

interface UsePoseDetailOptimizationProps {
  task: TaskWithDetails | null;
  currentStatus: string;
  currentUserId: string;
}

interface DerivedState {
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  progress: number;
  hasChecklist: boolean;
  hasPhotos: boolean;
  statusInfo: {
    label: string;
    color: string;
  };
}

export const usePoseDetailOptimization = ({
  task,
  currentStatus,
  currentUserId,
}: UsePoseDetailOptimizationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize task data with deep comparison to prevent unnecessary re-renders
  const safeTask: TaskDisplay | null = useMemo(() => {
    if (!task) return null;

    const convertedTask = convertTimestamps(task) as TaskWithDetails;

    let parsed_zones: string[] = [];
    if (typeof convertedTask.custom_ppf_zones === 'string') {
      try {
        parsed_zones = JSON.parse(convertedTask.custom_ppf_zones);
      } catch (e) {
        console.error("Failed to parse custom_ppf_zones", e);
      }
    }

    return {
      id: convertedTask.id || '',
      title: convertedTask.title || 'Sans titre',
      vehicle_plate: convertedTask.vehicle_plate || 'Non spécifiée',
      vehicle_model: convertedTask.vehicle_model || 'Non spécifié',
      vehicle_year: convertedTask.vehicle_year || null,
      vehicle_make: convertedTask.vehicle_make || null,
      vin: convertedTask.vin || null,
      date_rdv: convertedTask.date_rdv || null,
      heure_rdv: convertedTask.heure_rdv || null,
      lot_film: convertedTask.lot_film || null,
      note: convertedTask.note || null,
      photos_before: convertedTask.photos?.before || [],
      photos_after: convertedTask.photos?.after || [],
      checklist_items: convertedTask.checklist || [],
      status: currentStatus,
      ppf_zones: convertedTask.ppf_zones || [],
      is_available: convertedTask.is_available ?? true,
      technician_id: convertedTask.technician_id || null,
      assigned_at: convertedTask.assigned_at || null,
      scheduled_date: convertedTask.scheduled_date || null,
      start_time: convertedTask.start_time || null,
      end_time: convertedTask.end_time || null,
      workflow_status: convertedTask.workflow_status || null,
      photos: convertedTask.photos || { before: [], after: [], during: [] },
      checklist_completed: convertedTask.checklist_completed || false,
      created_at: convertedTask.created_at || new Date().toISOString(),
      updated_at: convertedTask.updated_at || new Date().toISOString(),
      assigned_to: convertedTask.technician_id || null,
      description: convertedTask.description || '',
      location: convertedTask.ppf_zones?.join(', ') || null,
      workflow_id: convertedTask.workflow_id || null,
      current_workflow_step_id: convertedTask.current_workflow_step_id || null,
      creator_id: convertedTask.created_by || null,
      checklist_id: convertedTask.id || null,
      external_id: convertedTask.id || null,
      task_number: convertedTask.task_number || null,
      template_id: convertedTask.template_id || null,
      started_at: convertedTask.started_at || null,
      completed_steps: convertedTask.completed_steps || {},
      custom_ppf_zones: parsed_zones,
      customer_name: task.customer_name || null,
      customer_email: task.customer_email || null,
      customer_phone: task.customer_phone || null,
      customer_address: task.customer_address || null,
      scheduled_at: task.scheduled_date || null,
    };
  }, [task, currentStatus]);

  // Memoize status information with stable reference
  const statusInfo = useMemo(() => {
    const statusMap = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
      termine: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
      default: { label: 'Inconnu', color: 'bg-gray-100 text-gray-800' },
    };
    return statusMap[safeTask?.status as keyof typeof statusMap] || statusMap.default;
  }, [safeTask?.status]);

  // Memoize derived state with stable references
  const derivedState: DerivedState | null = useMemo(() => {
    if (!safeTask) return null;
    
    const isAssignedToCurrentUser = safeTask.technician_id === currentUserId;
    const isAvailable = Boolean(safeTask.is_available && !safeTask.technician_id);
    const canStartTask = safeTask.is_available || isAssignedToCurrentUser;
    
    // Calculate task progress efficiently
    const progress = safeTask.checklist_items?.length 
      ? Math.round((safeTask.checklist_items.filter(item => item.is_completed).length / safeTask.checklist_items.length) * 100)
      : 0;

    return {
      isAssignedToCurrentUser,
      isAvailable,
      canStartTask,
      progress,
      hasChecklist: Boolean(safeTask.checklist_items?.length),
      hasPhotos: Boolean(safeTask.photos_before?.length || safeTask.photos_after?.length),
      statusInfo,
    };
  }, [safeTask, currentUserId, statusInfo]);

  // Event handlers with stable references
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Performance monitoring
  const performanceMetrics = useMemo(() => {
    if (!safeTask) return null;
    
    const startTime = performance.now();
    
    // Simulate some computation to measure performance
    const photoCount = (safeTask.photos_before?.length || 0) + (safeTask.photos_after?.length || 0);
    const checklistCount = safeTask.checklist_items?.length || 0;
    
    const endTime = performance.now();
    const computationTime = endTime - startTime;
    
    return {
      photoCount,
      checklistCount,
      computationTime,
      isOptimized: computationTime < 1, // Less than 1ms is considered optimized
    };
  }, [safeTask]);

  return {
    safeTask,
    derivedState,
    isExpanded,
    containerRef,
    handleToggleExpanded,
    performanceMetrics,
  };
};
