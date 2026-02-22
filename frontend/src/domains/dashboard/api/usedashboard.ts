import { useContext } from 'react';
import { dashboardContext } from './dashboardProvider';

export function usedashboard() {
  return useContext(dashboardContext);
}
