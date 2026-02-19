import type { UserAccount, UserRole } from '@/lib/backend';

export type { UserAccount, UserRole };

export interface UseUsersResult {
  users: UserAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseUserActionsResult {
  createUser: (payload: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    password: string;
  }) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  banUser: (id: string) => Promise<boolean>;
  unbanUser: (id: string) => Promise<boolean>;
  changeRole: (id: string, role: string) => Promise<boolean>;
}
