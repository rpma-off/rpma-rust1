// ❌ CROSS-DOMAIN IMPORT
import { bootstrapIpc } from '@/domains/bootstrap';

export const authBootstrap = {
  hasAdmins: () => bootstrapIpc.hasAdmins(),
  bootstrapFirstAdmin: (userId: string) =>
    bootstrapIpc.firstAdmin(userId),
};
