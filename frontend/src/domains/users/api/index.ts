/**
 * users Domain - Public API
 */

export { UsersProvider, useUsersContext } from './UsersProvider';
/** TODO: document */
export { useUsers } from './useUsers';
/** TODO: document */
export { useUserActions } from './useUserActions';
/** TODO: document */
export { useUserList } from '../hooks/useUserList';
/** TODO: document */
export type { UseUserListReturn } from '../hooks/useUserList';
/** TODO: document */
export { useUsersPage } from '../hooks/useUsersPage';

/** TODO: document */
export { UserList } from '../components/UserList';
/** TODO: document */
export { UserForm } from '../components/UserForm';
/** TODO: document */
export { ChangeRoleDialog } from '../components/ChangeRoleDialog';

/** TODO: document */
export { userService, AuthService, authService, TechnicianService } from '../server';
/** TODO: document */
export { technicianService } from '../services';

/** TODO: document */
export type {
  UserAccount,
  UserRole,
  UseUsersResult,
  UseUserActionsResult,
} from './types';

/** TODO: document */
export type { Technician } from '../services';
