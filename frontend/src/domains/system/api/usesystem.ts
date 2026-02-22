import { useContext } from 'react';
import { systemContext } from './systemProvider';

export function usesystem() {
  return useContext(systemContext);
}
