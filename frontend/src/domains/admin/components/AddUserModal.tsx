'use client';

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';
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
import { PasswordStrengthMeter } from '@/domains/auth';
import { validatePassword, PasswordValidationResult } from '@/lib/auth/password-validator';
import { generateTempPassword } from '@/lib/auth/password-generator';
import type { CreateUserRequest } from '@/shared/types';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface AddUserModalProps {
  onClose: () => void;
  onAddUser: (userData: CreateUserRequest) => void;
}

export function AddUserModal({ onClose, onAddUser }: AddUserModalProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isGeneratedPassword, setIsGeneratedPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);

  const handleGeneratePassword = useCallback(() => {
    const newPassword = generateTempPassword();
    setPassword(newPassword);
    setIsGeneratedPassword(true);
    setCopied(false);
    const result = validatePassword(newPassword);
    setValidation(result);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setIsGeneratedPassword(false);
    const result = validatePassword(newPassword);
    setValidation(result);
  }, []);

  const handleCopyPassword = useCallback(async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [password]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userData: CreateUserRequest = {
      email: String(formData.get('email') || ''),
      first_name: String(formData.get('firstName') || ''),
      last_name: String(formData.get('lastName') || ''),
      role: String(formData.get('role') || ''),
      password: password
    };
    onAddUser(userData);
  };

  const isSubmitDisabled = !validation?.isValid;

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.createUser')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-muted-foreground">{t('auth.password')}</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePassword}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('users.generatePassword')}
                </Button>
              </div>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  className="pr-10"
                  placeholder={t('users.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <PasswordStrengthMeter
                  password={password}
                  onValidationChange={setValidation}
                  showFeedback={true}
                />
              )}
              {isGeneratedPassword && password && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700 font-medium mb-2">
                    ⚠️ {t('users.passwordWarning')}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white rounded font-mono text-sm select-all">
                      {password}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPassword}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('users.passwordRequirements')}
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
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
              disabled={isSubmitDisabled}
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