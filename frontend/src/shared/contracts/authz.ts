export type UserRole =
  | 'Admin'
  | 'Supervisor'
  | 'Technician'
  | 'Viewer'
  | 'Manager'
  | 'User';

const ROLE_RANK: Record<UserRole, number> = {
  Viewer: 10,
  User: 10,
  Technician: 20,
  Supervisor: 30,
  Manager: 30,
  Admin: 40,
};

export function hasMinimumRole(currentRole: UserRole | null | undefined, minimumRole: UserRole): boolean {
  if (!currentRole) return false;
  const currentRank = ROLE_RANK[currentRole] ?? -1;
  const minimumRank = ROLE_RANK[minimumRole];
  return currentRank >= minimumRank;
}
