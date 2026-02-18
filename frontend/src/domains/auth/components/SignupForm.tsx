'use client';

import { useState } from 'react';
import { DesktopForm } from '@/shared/ui';
import { z } from 'zod';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

import { FieldValues } from 'react-hook-form';
import { useAuth } from '../api/useAuth';
import { UserRoleValues } from '@/shared/utils';

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe requis (8 caractères minimum)'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  role: z.enum(['technician', 'supervisor']).refine(val => val !== undefined, { message: 'Rôle requis' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
}).refine((data) => {
  const hasUpper = /[A-Z]/.test(data.password);
  const hasLower = /[a-z]/.test(data.password);
  const hasDigit = /[0-9]/.test(data.password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(data.password);

  const requirementsMet = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  return requirementsMet >= 3;
}, {
  message: "Le mot de passe doit contenir au moins 3 des 4 types de caractères requis (majuscule, minuscule, chiffre, spécial)",
  path: ["password"],
});

interface SignupFormProps {
  onSignupSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSignupSuccess, onSwitchToLogin }: SignupFormProps) {
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');



  const handleSignup = async (data: { email: string; password: string; confirmPassword: string; firstName: string; lastName: string; role: string }) => {
    setIsLoading(true);
    setPasswordError('');

    try {
      // Use AuthContext signUp method for proper state management
      const response = await auth.signUp(data.email, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role === 'technician' ? UserRoleValues.Technician : UserRoleValues.Supervisor,
      });

      if (response.success) {
        onSignupSuccess?.();
      } else {
        setPasswordError(response.error || 'Erreur lors de la création du compte');
      }
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du compte';
      setPasswordError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="bg-green-500 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p className="text-gray-600 mt-2">Rejoignez l&apos;équipe RPMA</p>
      </div>

      <div className="bg-background p-8 rounded-lg shadow-lg border border-border">
        <DesktopForm
          schema={signupSchema}
          onSubmit={(data: FieldValues) => handleSignup(data as { email: string; password: string; confirmPassword: string; firstName: string; lastName: string; role: string })}
          submitLabel={isLoading ? 'Création...' : 'Créer le compte'}
          isLoading={isLoading}
        >
          {(form) => (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-foreground mb-2">
                    Prénom
                  </label>
                  <input
                    {...form.register('firstName')}
                    type="text"
                     className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Jean"
                  />
                  {form.formState.errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                      {form.formState.errors.firstName.message as string}
                    </p>
                  )}
                </div>

                <div>
                   <label className="block text-sm font-medium text-foreground mb-2">
                    Nom
                  </label>
                  <input
                    {...form.register('lastName')}
                    type="text"
                     className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Dupont"
                  />
                  {form.formState.errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                      {form.formState.errors.lastName.message as string}
                    </p>
                  )}
                </div>
              </div>

               <div>
                 <label className="block text-sm font-medium text-foreground mb-2">
                   Email
                 </label>
                 <input
                   {...form.register('email')}
                   type="email"
                   autoComplete="email"
                   className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                   placeholder="jean.dupont@rpma.com"
                 />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.email.message as string}
                  </p>
                )}
              </div>

               <div>
                 <label className="block text-sm font-medium text-foreground mb-2">
                   Rôle
                 </label>
                 <select
                   {...form.register('role')}
                   className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent"
                   defaultValue=""
                 >
                  <option value="" disabled>Sélectionner un rôle</option>
                  <option value="technician">Technicien</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                {form.formState.errors.role && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.role.message as string}
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
                      autoComplete="new-password"
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

               <div>
                 <label className="block text-sm font-medium text-foreground mb-2">
                   Confirmer le mot de passe
                 </label>
                <div className="relative">
                    <input
                      {...form.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-10 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
                      placeholder="Répétez votre mot de passe"
                    />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.confirmPassword.message as string}
                  </p>
                )}
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordError}
                  </p>
                )}
              </div>
            </div>
          )}
        </DesktopForm>

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Déjà un compte ? Se connecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
