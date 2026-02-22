import { useMemo } from 'react';
import { DashboardTask } from '@/shared/types';

export const useTaskFiltering = (
  tasks: DashboardTask[],
  searchTerm: string,
  activeFilter: string,
  selectedTechnicianFilter: string,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): DashboardTask[] => {
  return useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    let filtered = [...tasks];

    // Filter by search term (title, vehicle, or technician)
    if (searchTerm?.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(searchLower) || false;
        const vehicleMatch = typeof task.vehicle === 'string' && task.vehicle.toLowerCase().includes(searchLower);
        const technicianMatch = task.technician?.name?.toLowerCase().includes(searchLower) || false;
        const customerMatch = task.customer_name?.toLowerCase().includes(searchLower) || false;
        
        return titleMatch || vehicleMatch || technicianMatch || customerMatch;
      });
    }
    
    // Filter by status
    if (activeFilter !== 'Tous les statuts') {
      filtered = filtered.filter(task => {
        if (activeFilter === 'En attente') return task.status === 'pending';
        if (activeFilter === 'En cours') return task.status === 'in_progress';
        if (activeFilter === 'Terminé') return task.status === 'completed';
        return true;
      });
    }
    
    // Filter by technician
    if (selectedTechnicianFilter !== 'Tous les techniciens') {
      filtered = filtered.filter(task => 
        task.technician?.name === selectedTechnicianFilter
      );
    }
    
    // Sort tasks
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aValue: number | string, bValue: number | string;
      
       switch (sortBy) {
         case 'created_at':
           aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
           bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
           break;
        case 'scheduled_date':
          aValue = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
          bValue = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1, normale: 2 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'status':
          const statusOrder: Record<string, number> = { 'pending': 1, 'in_progress': 2, 'completed': 3 };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [tasks, searchTerm, activeFilter, selectedTechnicianFilter, sortBy, sortOrder]);
};
