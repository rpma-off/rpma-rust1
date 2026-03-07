'use client';

import { useState } from 'react';
import { useAuth } from '../api/useAuth';
import { createLogger } from '@/shared/utils';

const logger = createLogger('useLoginForm');

interface LoginFormData {
  email: string;
  password: string;
}

export function useLoginForm() {
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      logger.debug('Tentative de connexion', { email: formData.email });
      const { error: signInError } = await signIn(formData.email, formData.password);

      if (signInError) {
        const errorMessage =
          typeof signInError === 'string'
            ? signInError
            : (signInError as Error).message || 'Erreur lors de la connexion';
        logger.error('Échec de la connexion', { email: formData.email, error: errorMessage });
        setError(errorMessage);
      } else {
        logger.info('Connexion réussie', { email: formData.email });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Une erreur inconnue est survenue';
      logger.error('Erreur lors de la connexion', { email: formData.email, error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    error,
    loading,
    isSubmitting,
    handleChange,
    handleSubmit,
  };
}
