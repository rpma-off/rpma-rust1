'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/shared/utils';

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
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { value: 'viewer', label: 'Observateur' },
    { value: 'technician', label: 'Technicien' },
    { value: 'supervisor', label: 'Superviseur' },
    { value: 'admin', label: 'Administrateur' }
  ];

  const handleSave = async () => {
    if (!user?.token) return;

    setIsLoading(true);
    try {
      await ipcClient.users.changeRole(userId, selectedRole, user.token);
      onOpenChange(false);
      toast.success('Rôle mis à jour avec succès');
    } catch (error) {
      toast.error('Échec de la mise à jour du rôle : ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le rôle de l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Changer le rôle de {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nouveau rôle
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
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading || selectedRole === currentRole}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

