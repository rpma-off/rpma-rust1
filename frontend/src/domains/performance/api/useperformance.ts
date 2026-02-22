import { useContext } from 'react';
import { performanceContext } from './performanceProvider';

export function useperformance() {
  return useContext(performanceContext);
}
