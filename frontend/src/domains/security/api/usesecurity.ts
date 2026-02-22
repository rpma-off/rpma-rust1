import { useContext } from 'react';
import { securityContext } from './securityProvider';

export function usesecurity() {
  return useContext(securityContext);
}
