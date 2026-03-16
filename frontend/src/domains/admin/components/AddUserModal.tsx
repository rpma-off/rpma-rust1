import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Button,
  Input,
} from '@/shared/ui/facade';
import type { CreateUserRequest } from '@/shared/types';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface AddUserModalProps {
  onClose: () => void;
  onAddUser: (userData: CreateUserRequest) => void;
}

export function AddUserModal({ onClose, onAddUser }: AddUserModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.createUser')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const userData: CreateUserRequest = {
            email: String(formData.get('email') || ''),
            first_name: String(formData.get('firstName') || ''),
            last_name: String(formData.get('lastName') || ''),
            role: String(formData.get('role') || ''),
            password: String(formData.get('password') || '')
          };
          onAddUser(userData);
        }}>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.email')}</label>
              <Input
                name="email"
                type="email"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.firstName')}</label>
                <Input
                  name="firstName"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.lastName')}</label>
                <Input
                  name="lastName"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.role')}</label>
              <select
                name="role"
                required
                className="w-full px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground"
              >
                <option value="viewer">{t('users.roleViewer')}</option>
                <option value="technician">{t('users.roleTechnician')}</option>
                <option value="supervisor">{t('users.roleSupervisor')}</option>
                <option value="admin">{t('users.roleAdmin')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('auth.password')}</label>
              <Input
                name="password"
                type="password"
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border/60 text-muted-foreground hover:bg-border/20"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="font-medium"
            >
              {t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
