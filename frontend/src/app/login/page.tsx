'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/compatibility';
import { ROUTES } from '@/constants';
import { createLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { FormFeedback } from '@/components/ui/form-feedback';
import { FadeIn } from '@/components/animations/FadeIn';
import { UILoader } from '@/components/animations/UILoader';

const logger = createLogger('LoginPage');

export default function LoginPage() {
  const { signIn, loading } = useAuth();
  const _router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      logger.debug('Tentative de connexion', { email: formData.email });
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        const errorMessage = typeof error === 'string' ? error : (error as Error).message || 'Erreur lors de la connexion';
        logger.error('Échec de la connexion', {
          email: formData.email,
          error: errorMessage
        });
        setError(errorMessage);
      } else {
        logger.info('Connexion réussie', { email: formData.email });
        // RootClientLayout will check admin status and redirect appropriately
        // No need to redirect here, let the layout handle it
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      logger.error('Erreur lors de la connexion', { 
        email: formData.email, 
        error: errorMessage 
      });
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--rpma-surface))] py-8 px-4 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="max-w-md w-full space-y-6">
          {/* Header Card */}
          <div className="rpma-shell p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--rpma-teal))]/10 mb-6">
                <svg className="w-8 h-8 text-[hsl(var(--rpma-teal))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Connexion</h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Accédez à votre tableau de bord RPMA V2
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
                      className="w-full px-4 py-3 bg-white border border-[hsl(var(--rpma-border))] rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20 focus:border-[hsl(var(--rpma-teal))] transition-all duration-200"
                      placeholder="votre@email.com"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-[hsl(var(--rpma-border))] rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20 focus:border-[hsl(var(--rpma-teal))] transition-all duration-200"
                      placeholder="••••••••"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Enhanced Submit Button */}
              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full"
                >
                  {(isSubmitting || loading) ? (
                    <>
                      <UILoader size="sm" className="mr-3" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </Button>

                {/* Alternative Actions */}
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Vous n&apos;avez pas de compte ?{' '}
                    <Link
                      href={ROUTES.SIGNUP}
                      className="font-semibold text-[hsl(var(--rpma-teal))] hover:text-[hsl(var(--rpma-teal))]/80 transition-colors duration-150"
                    >
                      Créer un compte
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Footer with Branding */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
              <div className="w-6 h-6 bg-[hsl(var(--rpma-teal))]/10 rounded flex items-center justify-center">
                <span className="text-[hsl(var(--rpma-teal))] font-bold text-xs">R</span>
              </div>
              <span>RPMA V2 - Système de gestion PPF</span>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
