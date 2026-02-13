'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserAccount, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { useTranslation } from '@/hooks/useTranslation';

interface UserFormProps {
  user?: UserAccount | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const { user: authUser } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'technician' as UserRole,
    password: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: (user.role === 'admin' || user.role === 'technician' || user.role === 'supervisor' || user.role === 'viewer') ? user.role as UserRole : 'technician' as UserRole,
        password: '', // Don't populate password for editing
        is_active: user.is_active,
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('users.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('users.invalidEmail');
    }



    if (!formData.first_name) {
      newErrors.first_name = t('users.firstNameRequired');
    }

    if (!formData.last_name) {
      newErrors.last_name = t('users.lastNameRequired');
    }

    if (!isEditing && !formData.password) {
      newErrors.password = t('users.passwordRequired');
    } else if (!isEditing && formData.password.length < 6) {
      newErrors.password = t('users.passwordMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (!authUser || !authUser.token) {
        toast.error(t('users.notAuthenticated'));
        return;
      }

      if (isEditing && user) {
        // Update existing user
        await ipcClient.users.update(formData.id, {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          is_active: formData.is_active,
        }, authUser.token);
      } else {
        // Create new user
        await ipcClient.users.create({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          password: formData.password,
        }, authUser.token);
      }

      onSuccess();
      toast.success(isEditing ? t('users.userUpdated') : t('users.userCreated'));
    } catch (error) {
      toast.error(t('users.saveFailed') + (error instanceof Error ? error.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-border w-96 shadow-lg rounded-md bg-background">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? t('users.editUser') : t('users.createNewUser')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium text-foreground">
                {t('users.email')}
              </label>
              <input
                id="user-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
                  errors.email ? 'border-destructive focus:ring-destructive' : 'border-input'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>



            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-first-name" className="block text-sm font-medium text-foreground">
                  {t('users.firstName')}
                </label>
                <input
                  id="user-first-name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
                    errors.first_name ? 'border-destructive focus:ring-destructive' : 'border-input'
                  }`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="user-last-name" className="block text-sm font-medium text-foreground">
                  {t('users.lastName')}
                </label>
                <input
                  id="user-last-name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
                    errors.last_name ? 'border-destructive focus:ring-destructive' : 'border-input'
                  }`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
                {t('users.role')}
              </label>
              <select
                id="user-role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                <input
                  id="user-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
                    errors.password ? 'border-destructive focus:ring-destructive' : 'border-input'
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            )}

            {isEditing && (
              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-foreground">
                  {t('users.active')}
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-[hsl(var(--rpma-teal))]/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? t('users.saving') : (isEditing ? t('common.update') : t('common.create'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
