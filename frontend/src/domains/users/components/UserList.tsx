'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserAccount } from '@/types';
import { useAuth } from '@/domains/auth';
import { bigintToNumber } from '@/lib/utils/timestamp-conversion';
import { ipcClient } from '@/lib/ipc';
import { ChangeRoleDialog } from './ChangeRoleDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/hooks/useTranslation';

interface UserListProps {
  users: UserAccount[];
  onEdit: (user: UserAccount) => void;
  onRefresh: () => void;
}

export function UserList({ users, onEdit, onRefresh }: UserListProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
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
        toast.error(t('users.notAuthenticated'));
        return;
      }

      await ipcClient.users.delete(userToDelete.id, user.token);

      onRefresh();
      toast.success(t('users.deactivatedSuccess'));
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error(t('users.deleteFailed') + (error instanceof Error ? error.message : ''));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteUser = (user: UserAccount) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const formatDate = (timestamp: bigint | string | null | undefined) => {
    if (!timestamp) return t('users.never');
    try {
      const date = typeof timestamp === 'bigint'
        ? new Date(bigintToNumber(timestamp) || 0)
        : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return t('users.invalidDate');
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
                  {t('users.fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('users.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('users.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('users.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('users.lastLogin')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('users.createdAt')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('common.actions')}
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
                      {user.is_active ? t('users.active') : t('users.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {user.last_login ? formatDate(user.last_login) : t('users.never')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     <button
                       onClick={() => onEdit(user)}
                       className="text-indigo-600 hover:text-indigo-900 mr-4"
                     >
                       {t('common.edit')}
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
                       {t('users.changeRole')}
                     </button>
                     <button
                       onClick={() => confirmDeleteUser(user)}
                       disabled={deletingId === user.id}
                       className="text-red-600 hover:text-red-900 disabled:opacity-50"
                     >
                       {deletingId === user.id ? t('users.deleting') : t('common.delete')}
                     </button>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="rpma-empty">
            <div className="text-muted-foreground">{t('users.noUsers')}</div>
          </div>
        )}
      </div>

      {roleChangeUser && (
        <ChangeRoleDialog
          userId={roleChangeUser.id}
          currentRole={roleChangeUser.role}
          userName={roleChangeUser.name}
          userEmail={roleChangeUser.email}
          open={!!roleChangeUser}
           onOpenChange={(open: boolean) => !open && setRoleChangeUser(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('users.deactivateUser')}
        description={t('users.deactivateConfirm', { name: `${userToDelete?.first_name} ${userToDelete?.last_name}` })}
        confirmText={t('users.deactivate')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
