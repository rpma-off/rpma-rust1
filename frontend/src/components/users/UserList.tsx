'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserAccount } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { bigintToNumber } from '@/lib/utils/timestamp-conversion';
import { ipcClient } from '@/lib/ipc';
import { ChangeRoleDialog } from '@/app/admin/users/components/ChangeRoleDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface UserListProps {
  users: UserAccount[];
  onEdit: (user: UserAccount) => void;
  onRefresh: () => void;
}

export function UserList({ users, onEdit, onRefresh }: UserListProps) {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeletingId(userToDelete.id);

      if (!user || !user.token) {
        toast.error('Not authenticated');
        return;
      }

      await ipcClient.users.delete(userToDelete.id, user.token);

      onRefresh();
      toast.success('User deactivated successfully');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteUser = (user: UserAccount) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const formatDate = (timestamp: bigint | string | null | undefined) => {
    if (!timestamp) return 'Never';
    try {
      const date = typeof timestamp === 'bigint'
        ? new Date(bigintToNumber(timestamp) || 0)
        : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'technician': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rpma-shell overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[hsl(var(--rpma-border))]">
            <thead className="rpma-table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[hsl(var(--rpma-border))]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[hsl(var(--rpma-surface))]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{user.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     <button
                       onClick={() => onEdit(user)}
                       className="text-indigo-600 hover:text-indigo-900 mr-4"
                     >
                       Edit
                     </button>
                     <button
                       onClick={() => setRoleChangeUser({
                         id: user.id,
                         name: `${user.first_name} ${user.last_name}`,
                         email: user.email,
                         role: user.role
                       })}
                       className="text-blue-600 hover:text-blue-900 mr-4"
                     >
                       Change Role
                     </button>
                     <button
                       onClick={() => confirmDeleteUser(user)}
                       disabled={deletingId === user.id}
                       className="text-red-600 hover:text-red-900 disabled:opacity-50"
                     >
                       {deletingId === user.id ? 'Deleting...' : 'Delete'}
                     </button>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="rpma-empty">
            <div className="text-muted-foreground">No users found</div>
          </div>
        )}
      </div>

      {roleChangeUser && (
        <ChangeRoleDialog
          userId={roleChangeUser.id}
          currentRole={roleChangeUser.role as any}
          userName={roleChangeUser.name}
          userEmail={roleChangeUser.email}
          open={!!roleChangeUser}
           onOpenChange={(open: boolean) => !open && setRoleChangeUser(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${userToDelete?.first_name} ${userToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
