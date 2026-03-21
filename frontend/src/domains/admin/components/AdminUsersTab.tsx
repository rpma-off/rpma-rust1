import React, { useState, useCallback } from 'react';
import {
  CheckCircle,
  Copy,
  KeyRound,
  Plus,
  Search,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  LoadingState,
} from '@/shared/ui/facade';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { ipcClient } from '@/shared/utils';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AdminUsersTabProps {
  filteredUsers: AdminUser[];
  isLoading: boolean;
  searchQuery: string;
  roleFilter: string;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: string) => void;
  onAddUser: () => void;
  onUpdateUserStatus: (userId: string, isActive: boolean) => void;
  onDeleteUser: (userId: string) => void;
  onReloadUsers?: () => void;
}

export function AdminUsersTab({
  filteredUsers,
  isLoading,
  searchQuery,
  roleFilter,
  setSearchQuery,
  setRoleFilter,
  onAddUser,
  onUpdateUserStatus,
  onDeleteUser,
  onReloadUsers,
}: AdminUsersTabProps) {
  const { t } = useTranslation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const requestDeleteUser = useCallback((user: AdminUser) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
      setDeleteConfirmOpen(false);
    }
  }, [userToDelete, onDeleteUser]);

  const handleResetPassword = useCallback(async (user: AdminUser) => {
    setResetPasswordUser(user);
    setTempPassword(null);
    setCopied(false);
    setIsResetting(true);
    try {
      const pwd = await ipcClient.users.adminResetPassword(user.id);
      setTempPassword(pwd);
      onReloadUsers?.();
    } finally {
      setIsResetting(false);
    }
  }, [onReloadUsers]);

  const handleCopyPassword = useCallback(() => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [tempPassword]);

  return (
    <>
      <Card className="border-[hsl(var(--rpma-border))] bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">{t('admin.userManagement')}</CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('users.createUser')}
          </Button>
        </div>
        <CardDescription className="text-muted-foreground">
          {t('users.title')}
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-4">
             <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Rechercher utilisateurs..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10"
               />
             </div>
             <select
               value={roleFilter}
               onChange={(e) => setRoleFilter(e.target.value)}
               className="px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground text-sm"
             >
               <option value="all">Tous les rôles</option>
               <option value="admin">Administrateur</option>
               <option value="supervisor">Superviseur</option>
               <option value="technician">Technicien</option>
               <option value="viewer">Observateur</option>
             </select>
           </div>
           <Button
             onClick={onAddUser}
             className="font-medium"
           >
             <Plus className="h-4 w-4 mr-2" />
             Ajouter Utilisateur
           </Button>
         </div>

         <div className="space-y-3">
           {isLoading ? (
             <LoadingState message={t('common.loading')} />
           ) : filteredUsers.length === 0 ? (
             <EmptyState
               icon={<User className="h-8 w-8 text-muted-foreground" />}
               title={t('users.noUsers')}
               description={t('empty.noData')}
             />
           ) : (
             <div className="space-y-2">
               {filteredUsers.map((user) => (
                   <div key={user.id} className="flex items-center justify-between p-4 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[hsl(var(--rpma-surface))] rounded-full flex items-center justify-center">
                         <User className="h-5 w-5 text-foreground" />
                       </div>
                       <div>
                         <p className="text-foreground font-medium">{user.first_name} {user.last_name}</p>
                         <p className="text-muted-foreground text-sm">{user.email}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                         {user.role === 'admin' ? 'Admin' :
                          user.role === 'supervisor' ? 'Superviseur' :
                          user.role === 'technician' ? 'Technicien' : 'Observateur'}
                       </Badge>
                       <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-xs">
                         {user.is_active ? 'Actif' : 'Inactif'}
                       </Badge>
                       <div className="flex gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => onUpdateUserStatus(user.id, !user.is_active)}
                           className="border-border/60 text-muted-foreground hover:bg-border/20"
                         >
                           {user.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleResetPassword(user)}
                           title="Réinitialiser le mot de passe"
                           className="border-border/60 text-muted-foreground hover:bg-border/20"
                         >
                           <KeyRound className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => requestDeleteUser(user)}
                           className="border-red-500/60 text-red-400 hover:bg-red-500/20"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     </div>
                   </div>
                 ))}
             </div>
           )}
         </div>
      </CardContent>
    </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setUserToDelete(null);
        }}
        title={t('users.deleteUser')}
        description={t('users.confirmDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      {/* Reset password dialog */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Réinitialisation du mot de passe
            </h3>
            <p className="text-sm text-muted-foreground">
              {resetPasswordUser.first_name} {resetPasswordUser.last_name} — {resetPasswordUser.email}
            </p>

            {isResetting && (
              <p className="text-sm text-muted-foreground animate-pulse">Génération en cours…</p>
            )}

            {tempPassword && (
              <div className="space-y-2">
                <p className="text-xs text-amber-600 font-medium">
                  ⚠ Ce mot de passe temporaire ne sera affiché qu&apos;une seule fois.
                </p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm">
                  <span className="flex-1 select-all">{tempPassword}</span>
                  <Button variant="ghost" size="sm" onClick={handleCopyPassword}>
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transmettez ce mot de passe à l&apos;utilisateur de manière sécurisée.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordUser(null);
                  setTempPassword(null);
                }}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
