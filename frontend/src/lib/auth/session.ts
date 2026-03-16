import { AuthSecureStorage } from '@/lib/secureStorage';

/**
 * Retrieves the current session token from secure storage.
 * Returns null if no session exists or if secure storage is unavailable.
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    const session = await AuthSecureStorage.getSession();
    return session.token;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session token from secure storage.
 * Throws an AUTHENTICATION error if no session token is available.
 */
export async function requireSessionToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) {
    const error = new Error("Erreur d'authentification. Veuillez vous reconnecter.");
    (error as Error & { code: string }).code = 'AUTHENTICATION';
    throw error;
  }
  return token;
}
