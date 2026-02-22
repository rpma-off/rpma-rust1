import { useContext } from 'react';
import { photosContext } from './photosProvider';

export function usePhotos() {
  return useContext(photosContext);
}
