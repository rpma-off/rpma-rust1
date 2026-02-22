import { useContext } from 'react';
import { UiContext } from './uiProvider';

export function useUi() {
  return useContext(UiContext);
}
