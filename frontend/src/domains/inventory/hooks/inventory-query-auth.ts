const AUTH_ERROR_MESSAGE = 'Authentication required';
const PERMISSION_ERROR_MESSAGE = 'Insufficient permissions for inventory access';

export function getInventoryAuthError(
  sessionToken: string | undefined,
  hasInventoryAccess: boolean,
): string | null {
  if (!sessionToken) {
    return AUTH_ERROR_MESSAGE;
  }

  if (!hasInventoryAccess) {
    return PERMISSION_ERROR_MESSAGE;
  }

  return null;
}

export { AUTH_ERROR_MESSAGE, PERMISSION_ERROR_MESSAGE };
