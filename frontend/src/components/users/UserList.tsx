'use client';

import { useState } from 'react';
import { UserAccount } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { bigintToNumber } from '@/lib/utils/timestamp-conversion';
import { ipcClient } from '@/lib/ipc';
import { ChangeRoleDialog } from '@/app/admin/users/components/ChangeRoleDialog';

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

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      setDeletingId(userId);
      
      if (!user || !user.token) {
        alert('Not authenticated');
        return;
      }

      await ipcClient.users.delete(userId, user.token);

      onRefresh();
    } catch (error) {
      alert('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
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
    <div className="bg-muted/50 rounded-xl border border-border/20 shadow-lg backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-border uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-muted/50 divide-y divide-border/20">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-border">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-border">
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-border">
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
                       onClick={() => handleDelete(user.id)}
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
          <div className="text-center py-12">
            <div className="text-border">No users found</div>
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
    </div>
  );
}