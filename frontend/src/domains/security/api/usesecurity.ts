import { useContext } from 'react';
import { securityContext } from './securityProvider';

export function useSecurity() {
  return useContext(securityContext);
}
