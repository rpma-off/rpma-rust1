import React from 'react';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('users.createUser')}</h3>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.email')}</label>
              <Input
                name="email"
                type="email"
                required
                className=""
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.firstName')}</label>
                <Input
                  name="firstName"
                  required
                  className=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.lastName')}</label>
                <Input
                  name="lastName"
                  required
                  className=""
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
                className=""
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border/60 text-muted-foreground hover:bg-border/20"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 font-medium"
            >
              {t('common.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
