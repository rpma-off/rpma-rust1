import { bootstrapIpc } from '@/domains/bootstrap';

export const authBootstrap = {
  hasAdmins: () => bootstrapIpc.hasAdmins(),
  bootstrapFirstAdmin: (userId: string, sessionToken: string) =>
    bootstrapIpc.firstAdmin(userId, sessionToken),
};
