/**
 * Trash domain — UI hooks.
 *
 * Re-exports TanStack Query hooks from api/index.ts for use by UI components.
 */

export {
  useTrashList,
  useRestoreEntity,
  useHardDeleteEntity,
  useEmptyTrash,
  trashKeys,
} from '../api';
