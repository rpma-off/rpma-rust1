import { useContext } from 'react';
import { bootstrapContext } from './bootstrapProvider';

export function usebootstrap() {
  return useContext(bootstrapContext);
}
