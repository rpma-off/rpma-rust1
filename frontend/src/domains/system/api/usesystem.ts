import { useContext } from 'react';
import { systemContext } from './systemProvider';

export function useSystem() {
  return useContext(systemContext);
}
