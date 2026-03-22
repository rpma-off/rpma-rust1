'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useUserActions } from '../api/useUserActions';

interface ChangeRoleDialogProps {
  userId: string;
  currentRole: string;
  userName: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeRoleDialog({
  userId,
  currentRole,
  userName,
  userEmail,
  open,
  onOpenChange
}: ChangeRoleDialogProps) {
  const { changeRole } = useUserActions();
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) setSelectedRole(currentRole);
  }, [open, currentRole]);

  const roles = [
    { value: 'viewer', label: t('users.roleViewer') },
    { value: 'technician', label: t('users.roleTechnician') },
    { value: 'supervisor', label: t('users.roleSupervisor') },
    { value: 'admin', label: t('users.roleAdmin') }
  ];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await changeRole(userId, selectedRole);
      if (!success) {
        toast.error(t('users.notAuthenticated'));
        return;
      }
      onOpenChange(false);
      toast.success(t('users.roleUpdated'));
    } catch (error) {
      toast.error(t('users.roleUpdateFailed') + (error instanceof Error ? error.message : ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.changeRole')}</DialogTitle>
          <DialogDescription>
            {t('users.changeRoleDescription', { name: userName, email: userEmail })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('users.newRole')}
          </label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || selectedRole === currentRole}>
            {isLoading ? t('users.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

