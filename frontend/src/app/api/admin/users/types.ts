export type UserRole = 'admin' | 'technician' | 'manager' | 'viewer' | 'technicien';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
  last_sign_in_at?: string;
  banned_at?: string | null;
  user_metadata?: {
    role?: UserRole;
    full_name?: string;
    [key: string]: unknown;
  };
}
