import { AuthSecureStorage } from '@/lib/secureStorage';

export async function getSessionToken(): Promise<string | null> {
  try {
    const session = await AuthSecureStorage.getSession();
    return session.token;
  } catch {
    return null;
  }
}

export async function requireSessionToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) {
    const error = new Error("Erreur d'authentification. Veuillez vous reconnecter.");
    (error as Error & { code: string }).code = 'AUTHENTICATION';
    throw error;
  }
  return token;
}
