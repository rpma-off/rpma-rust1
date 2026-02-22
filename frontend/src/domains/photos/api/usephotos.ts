import { useContext } from 'react';
import { photosContext } from './photosProvider';

export function usephotos() {
  return useContext(photosContext);
}
