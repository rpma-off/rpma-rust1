'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { UserAccount, UserRole } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useUserActions } from '../api/useUserActions';

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  password: string;
  is_active: boolean;
}

interface UserFormProps {
  user?: UserAccount | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const { createUser, updateUser } = useUserActions();
  const { t } = useTranslation();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'technician',
      password: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (user) {
      const validRoles: UserRole[] = ['admin', 'technician', 'supervisor', 'viewer'];
      reset({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: validRoles.includes(user.role as UserRole) ? (user.role as UserRole) : 'technician',
        password: '',
        is_active: user.is_active,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing && user) {
        const success = await updateUser(user.id, {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          is_active: data.is_active,
        });
        if (!success) {
          toast.error(t('users.notAuthenticated'));
          return;
        }
      } else {
        const success = await createUser({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          password: data.password,
        });
        if (!success) {
          toast.error(t('users.notAuthenticated'));
          return;
        }
      }
      onSuccess();
      toast.success(isEditing ? t('users.userUpdated') : t('users.userCreated'));
    } catch (error) {
      toast.error(t('users.saveFailed') + (error instanceof Error ? error.message : ''));
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('users.editUser') : t('users.createNewUser')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-foreground">
              {t('users.email')}
            </label>
            <Input
              id="user-email"
              type="email"
              aria-label={t('users.email')}
              {...register('email', {
                required: t('users.emailRequired'),
                pattern: { value: /\S+@\S+\.\S+/, message: t('users.invalidEmail') },
              })}
              className={`mt-1 ${errors.email ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-first-name" className="block text-sm font-medium text-foreground">
                {t('users.firstName')}
              </label>
              <Input
                id="user-first-name"
                aria-label={t('users.firstName')}
                {...register('first_name', { required: t('users.firstNameRequired') })}
                className={`mt-1 ${errors.first_name ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="user-last-name" className="block text-sm font-medium text-foreground">
                {t('users.lastName')}
              </label>
              <Input
                id="user-last-name"
                aria-label={t('users.lastName')}
                {...register('last_name', { required: t('users.lastNameRequired') })}
                className={`mt-1 ${errors.last_name ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-foreground">
              {t('users.role')}
            </label>
            <select
              id="user-role"
              aria-label={t('users.role')}
              {...register('role')}
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="viewer">{t('users.roleViewer')}</option>
              <option value="technician">{t('users.roleTechnician')}</option>
              <option value="supervisor">{t('users.roleSupervisor')}</option>
              <option value="admin">{t('users.roleAdmin')}</option>
            </select>
          </div>

          {!isEditing && (
            <div>
              <label htmlFor="user-password" className="block text-sm font-medium text-foreground">
                {t('auth.password')}
              </label>
              <Input
                id="user-password"
                type="password"
                aria-label={t('auth.password')}
                {...register('password', {
                  required: t('users.passwordRequired'),
                  minLength: { value: 6, message: t('users.passwordMinLength') },
                })}
                className={`mt-1 ${errors.password ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          )}

          {isEditing && (
            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                aria-label={t('users.active')}
                {...register('is_active')}
                className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-foreground">
                {t('users.active')}
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-input text-foreground hover:bg-[hsl(var(--rpma-teal))]/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? t('users.saving') : (isEditing ? t('common.update') : t('common.create'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
