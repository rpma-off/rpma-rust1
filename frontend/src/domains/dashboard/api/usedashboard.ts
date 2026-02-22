import { useContext } from 'react';
import { dashboardContext } from './dashboardProvider';

export function useDashboard() {
  return useContext(dashboardContext);
}
