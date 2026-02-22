import { useContext } from 'react';
import { performanceContext } from './performanceProvider';

export function usePerformance() {
  return useContext(performanceContext);
}
