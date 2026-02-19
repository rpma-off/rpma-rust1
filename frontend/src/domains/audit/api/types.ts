import type { ChangeLogWithUser } from '../server';

export type { ChangeLogWithUser };

export interface UseAuditLogResult {
  logs: ChangeLogWithUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
