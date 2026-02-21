// Auth domain hooks
// Primary auth hooks (useAuth, useAuthActions) live in api/ as they are tightly coupled
// with the AuthProvider context. Re-export them here for domain hook access.
export { useAuth } from '../api/useAuth';
export { useAuthActions } from '../api/useAuthActions';
