import { ipcClient } from '@/lib/ipc';
import type { UserSession } from '@/lib/backend';
import type { UserAccount } from '@/lib/types';
import type { SignupRequest } from '@/lib/ipc/types';

export const authIpc = {
  login: (email: string, password: string): Promise<UserSession> =>
    ipcClient.auth.login(email, password),

  createAccount: (request: SignupRequest): Promise<UserSession> =>
    ipcClient.auth.createAccount(request),

  refreshToken: (refreshToken: string): Promise<UserSession> =>
    ipcClient.auth.refreshToken(refreshToken),

  logout: (token: string): Promise<void> =>
    ipcClient.auth.logout(token),

  validateSession: (token: string): Promise<UserSession> =>
    ipcClient.auth.validateSession(token),

  getUserProfile: (userId: string, sessionToken: string): Promise<UserAccount | null> =>
    ipcClient.users.get(userId, sessionToken) as Promise<UserAccount | null>,

  hasAdmins: (): Promise<boolean> =>
    ipcClient.bootstrap.hasAdmins(),

  bootstrapFirstAdmin: (userId: string, sessionToken: string): Promise<string> =>
    ipcClient.bootstrap.firstAdmin(userId, sessionToken),
};
