import { useContext } from 'react';
import { bootstrapContext } from './bootstrapProvider';

export function useBootstrap() {
  return useContext(bootstrapContext);
}
