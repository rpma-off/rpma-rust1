// User profile utilities

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
}

export const formatUserName = (user: UserProfile): string => {
  return `${user.firstName} ${user.lastName}`.trim();
};

export const getUserInitials = (user: UserProfile): string => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
};

export const isAdmin = (user: UserProfile): boolean => {
  return user.role === 'admin' || user.role === 'superadmin';
};

export const isActive = (user: UserProfile): boolean => {
  return user.isActive;
};

export const getUserProfileWithRole = async (supabaseClient: unknown, userId: string): Promise<{ profile: UserProfile | null; hasRequiredRole: (role: string) => boolean; error: string | null }> => {
  // TODO: Implement user profile fetching with role
  console.log('Getting user profile with role for:', userId);
  return {
    profile: null,
    hasRequiredRole: (role: string) => false,
    error: null
  };
};