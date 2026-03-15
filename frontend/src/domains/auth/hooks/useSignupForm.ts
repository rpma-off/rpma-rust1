'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRoleValues } from '@/shared/utils';
import { createLogger } from '@/shared/utils';
import { ROUTES } from '@/constants';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { PasswordValidationResult } from '../api/types';
import { useAuth } from '../api/useAuth';
import { isValidEmailFormat } from '@/lib/utils/validators';

const logger = createLogger('useSignupForm');

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export function useSignupForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const handlePasswordValidationChange = (validation: PasswordValidationResult) => {
    setIsPasswordValid(validation.isValid);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.firstName || !formData.lastName) {
      setError(t('errors.allFieldsRequired'));
      return false;
    }

    if (!isValidEmailFormat(formData.email)) {
      setError(t('errors.invalidEmail'));
      return false;
    }

    if (!isPasswordValid) {
      setError(t('errors.weakPassword'));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      logger.debug('Tentative d\'inscription', { email: formData.email });

      const response = await auth.signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: UserRoleValues.Technician,
      });

      if (response.success) {
        logger.info('Inscription réussie', { email: formData.email });
        setSuccess(true);

        setTimeout(() => {
          router.push(ROUTES.LOGIN);
        }, 3000);
      } else {
        const errorMessage = response.error || t('errors.signupFailed');
        logger.error('Échec de l\'inscription', { email: formData.email, error: errorMessage });
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.unknownError');
      logger.error('Erreur lors de l\'inscription', { email: formData.email, error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => router.push(ROUTES.LOGIN);

  return {
    formData,
    error,
    isLoading,
    success,
    isPasswordValid,
    handleChange,
    handlePasswordValidationChange,
    handleSubmit,
    handleGoToLogin,
  };
}
