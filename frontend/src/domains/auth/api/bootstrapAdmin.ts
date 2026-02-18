import { authIpc } from '../ipc/auth.ipc';

export const authBootstrap = {
  hasAdmins: () => authIpc.hasAdmins(),
  bootstrapFirstAdmin: (userId: string, sessionToken: string) =>
    authIpc.bootstrapFirstAdmin(userId, sessionToken),
};
