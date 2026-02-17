'use client';

import { useState } from 'react';
import { DesktopForm } from '../forms/DesktopForm';
import { z } from 'zod';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import type { LoginCredentials } from '../api/types';
import { FieldValues } from 'react-hook-form';
import { useAuth } from '../api/useAuth';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe requis (8 caractères minimum)'),
});

interface LoginFormProps {
  onLoginSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export function LoginForm({ onLoginSuccess, onSwitchToSignup }: LoginFormProps) {
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  const handleLogin = async (data: LoginCredentials) => {
    setIsLoading(true);
    try {
      // Use AuthContext signIn method for proper state management
      const response = await auth.signIn(data.email, data.password);

      if (response.success) {
        onLoginSuccess?.();
      } else {
        throw new Error(response.error || 'Email ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Email ou mot de passe incorrect';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="bg-blue-500 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
          <LogIn className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Connexion RPMA v2</h1>
        <p className="text-gray-600 mt-2">Accédez à votre espace de travail</p>
      </div>

      <div className="bg-background p-8 rounded-lg shadow-lg border border-border">
        <DesktopForm
          schema={loginSchema}
          onSubmit={(data: FieldValues) => handleLogin(data as LoginCredentials)}
          submitLabel={isLoading ? 'Connexion...' : 'Se connecter'}
          isLoading={isLoading}
        >
          {(form) => (
            <div className="space-y-6">
              <div>
                 <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                 <input
                   {...form.register('email')}
                   type="email"
                   autoComplete="email"
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                   placeholder="votre.email@exemple.com"
                 />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.email.message as string}
                  </p>
                )}
              </div>

              <div>
                 <label className="block text-sm font-medium text-foreground mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                   <input
                     {...form.register('password')}
                     type={showPassword ? 'text' : 'password'}
                     autoComplete="current-password"
                     className="w-full px-3 py-2 pr-10 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                     placeholder="Votre mot de passe"
                   />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.password.message as string}
                  </p>
                )}
              </div>
            </div>
          )}
        </DesktopForm>

        {onSwitchToSignup && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToSignup}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Pas encore de compte ? S&apos;inscrire
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
