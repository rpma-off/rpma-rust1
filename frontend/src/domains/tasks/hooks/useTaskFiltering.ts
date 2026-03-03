import { useDashboardTaskFiltering } from '@/shared/hooks/useDashboardTaskFiltering';
import { DashboardTask } from '@/shared/types';

export const useTaskFiltering = (
  tasks: DashboardTask[],
  searchTerm: string,
  activeFilter: string,
  selectedTechnicianFilter: string,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): DashboardTask[] => {
  return useDashboardTaskFiltering({
    tasks,
    searchTerm,
    activeFilter,
    selectedTechnicianFilter,
    sortBy,
    sortOrder,
  });
};

