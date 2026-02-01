'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';
import { UserRoleValues } from '@/lib/types';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/button';
import { FormFeedback } from '@/components/ui/form-feedback';
import { FadeIn } from '@/components/animations/FadeIn';
import { UILoader } from '@/components/animations/UILoader';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter';
import { PasswordValidationResult } from '@/lib/auth/password-validator';

const logger = createLogger('SignupPage');

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const [formData, setFormData] = useState({
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.firstName || !formData.lastName) {
      setError('Tous les champs sont obligatoires');
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }

    if (!isPasswordValid) {
      setError('Veuillez choisir un mot de passe plus sécurisé.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
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

        // Rediriger vers la page de connexion après un court délai
        setTimeout(() => {
          router.push(ROUTES.LOGIN);
        }, 3000);
      } else {
        const errorMessage = response.error || 'Une erreur est survenue lors de l\'inscription';
        logger.error('Échec de l\'inscription', { email: formData.email, error: errorMessage });
        setError(errorMessage);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      logger.error('Erreur lors de l\'inscription', {
        email: formData.email,
        error: errorMessage
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-border/10 py-8 px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="max-w-md w-full space-y-6">
            {/* Header Card */}
            <div className="bg-background text-foreground p-8 rounded-2xl shadow-2xl border border-border/20">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-6">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Inscription réussie !</h2>
                <p className="text-border-light text-sm md:text-base">
                  Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-accent mb-1">Bienvenue sur RPMA V2 !</h4>
                      <p className="text-sm text-border-light">Votre compte a été créé avec succès.</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => router.push(ROUTES.LOGIN)}
                  className="w-full bg-accent hover:bg-accent/90 text-black"
                >
                  Aller à la connexion
                </Button>
              </div>
            </div>

            {/* Footer with Branding */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-border-light text-xs">
                <div className="w-6 h-6 bg-accent/20 rounded flex items-center justify-center">
                  <span className="text-accent font-bold text-xs">R</span>
                </div>
                <span>RPMA V2 - Système de gestion PPF</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-border/10 py-8 px-4 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="max-w-md w-full space-y-6">
          {/* Header Card */}
          <div className="bg-background text-foreground p-8 rounded-2xl shadow-2xl border border-border/20">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-6">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Créer un compte</h2>
              <p className="text-border-light text-sm md:text-base">
                Rejoignez RPMA V2 et commencez à gérer vos projets PPF
              </p>
            </div>

            {/* Enhanced Error Display */}
            {error && (
              <FormFeedback
                type="error"
                message={error}
                className="animate-in slide-in-from-top-2 duration-300"
              />
            )}

            {/* Enhanced Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-semibold text-foreground">
                      Prénom
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-border/10 border border-border/30 rounded-xl text-foreground placeholder-border-light focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                        placeholder="Jean"
                      />
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-semibold text-foreground">
                      Nom
                    </label>
                    <div className="relative">
                      <input
                        id="lastName"
                        name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-border/10 border border-border/30 rounded-xl text-foreground placeholder-border-light focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                      placeholder="Dupont"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-foreground">
                  Adresse email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-border/10 border border-border/30 rounded-xl text-foreground placeholder-border-light focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                    placeholder="votre@email.com"
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-border/10 border border-border/30 rounded-xl text-foreground placeholder-border-light focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <PasswordStrengthMeter
                  password={formData.password}
                  onValidationChange={handlePasswordValidationChange}
                  showFeedback={true}
                />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-border/10 border rounded-xl text-foreground placeholder-border-light focus:outline-none focus:ring-2 transition-all duration-200 ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                        : 'border-border/30 focus:ring-accent/50 focus:border-accent'
                    }`}
                    placeholder="••••••••"
                  />
                  <svg className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'text-red-400'
                      : 'text-border'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {formData.confirmPassword && formData.password === formData.confirmPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    )}
                  </svg>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
            </div>

          {/* Enhanced Submit Button */}
          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading || !isPasswordValid || (formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword)}
              className={`w-full flex justify-center items-center py-3 px-4 text-sm font-semibold rounded-xl bg-accent text-black hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:hover:scale-100`}
            >
              {isLoading ? (
                <>
                  <UILoader size="sm" className="mr-3" />
                  Création en cours...
                </>
              ) : (
                <>
                  Créer mon compte
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </Button>

            {/* Alternative Actions */}
            <div className="text-center">
              <p className="text-border-light text-sm">
                Vous avez déjà un compte ?{' '}
                <Link
                  href={ROUTES.LOGIN}
                  className="font-semibold text-accent hover:text-accent/80 transition-colors duration-150"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="pt-4 border-t border-border/20">
            <p className="text-center text-xs text-border-light leading-relaxed">
              En vous inscrivant, vous acceptez nos conditions d&apos;utilisation et notre politique de confidentialité.
            </p>
          </div>
        </form>
        </div>
        </div>

        {/* Footer with Branding */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 text-border-light text-xs">
          <div className="w-6 h-6 bg-accent/20 rounded flex items-center justify-center">
            <span className="text-accent font-bold text-xs">R</span>
          </div>
          <span>RPMA V2 - Système de gestion PPF</span>
        </div>
      </div>
    </FadeIn>
    </div>
  );
}
