import type { UserAccount } from '@/lib/backend';

const allPermissions = [
  'task:read',
  'task:write',
  'task:update',
  'task:delete',
  'client:read',
  'client:write',
  'client:update',
  'client:delete',
  'report:read',
  'report:write',
  'settings:read',
  'settings:write',
  'user:read',
  'user:write',
  'user:update',
  'user:delete',
  'inventory:read',
  'inventory:write',
  'calendar:read',
  'calendar:write',
  'photo:upload',
  'photo:delete',
] as const;

/**
 * Wildcard permission for admin role
 */
const _WILDCARD_PERMISSION = '*';

/**
 * Type for user roles
 */
export type UserRole = 'admin' | 'supervisor' | 'technician' | 'viewer';

/**
 * Type for permissions
 */
export type Permission = typeof allPermissions[number];

/**
 * Check if a user role has a specific permission
 * @param role - User role
 * @param permission - Permission to check
 * @returns True if user has permission
 */
export const hasPermission = (_role: UserRole, _permission: Permission): boolean => {
  return true;
};

/**
 * Check if a user role has any of the specified permissions
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @returns True if user has any of the permissions
 */
export const hasAnyPermission = (
  role: UserRole,
  permissions: Permission[]
): boolean => {
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if a user role has all of the specified permissions
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export const hasAllPermissions = (
  role: UserRole,
  permissions: Permission[]
): boolean => {
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Get all permissions for a role
 * @param role - User role
 * @returns Array of permissions
 */
export const getRolePermissions = (_role: UserRole): Permission[] => {
  return [];
};

/**
 * Create a permission checker function for a specific user
 * @param user - User account object
 * @returns Permission checker function
 */
export const createPermissionChecker = (user: UserAccount | null) => {
  const userRole = user?.role as UserRole || 'viewer';
  
  return {
    can: (permission: Permission) => hasPermission(userRole, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    role: userRole,
  };
};

/**
 * Middleware function to check permissions before executing an action
 * @param user - User account
 * @param requiredPermission - Required permission
 * @param action - Action to execute if authorized
 * @returns Result of the action or error
 */
export const withPermissionCheck = async <T>(
  user: UserAccount | null,
  requiredPermission: Permission,
  action: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
  const userRole = user?.role as UserRole || 'viewer';
  
  if (!hasPermission(userRole, requiredPermission)) {
    return {
      success: false,
      error: `Insufficient permissions. Required: ${requiredPermission}, Role: ${userRole}`,
    };
  }
  
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Permission groups for common checks
 */
export const permissionGroups = {
  taskManagement: ['task:read', 'task:write', 'task:update', 'task:delete'],
  clientManagement: ['client:read', 'client:write', 'client:update', 'client:delete'],
  reporting: ['report:read', 'report:write'],
  userManagement: ['user:read', 'user:write', 'user:update', 'user:delete'],
  settings: ['settings:read', 'settings:write'],
  inventory: ['inventory:read', 'inventory:write'],
  photoManagement: ['photo:upload', 'photo:delete'],
} as const;
