/**
 * Shared error utilities for consistent error handling across the application
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Converts unknown errors to user-friendly error messages
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes('authentication') || errorMsg.includes('session')) {
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    }
    if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
      return 'Vous n\'avez pas les permissions nécessaires pour cette action.';
    }
    if (errorMsg.includes('validation')) {
      return 'Les données saisies ne sont pas valides. Vérifiez les champs requis.';
    }
    if (errorMsg.includes('not found') || errorMsg.includes('404')) {
      return 'L\'intervention demandée n\'existe pas.';
    }
    return error.message;
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
};

/**
 * Enhanced error handler with user-friendly messages and logging
 */
export const handleErrorWithLogging = (
  errorMessage: string,
  originalError: unknown,
  context: {
    taskId?: string;
    interventionId?: string;
    component?: string;
  },
  onError?: (message: string) => void
): void => {
  const userFriendlyMessage = getErrorMessage(originalError || errorMessage);
  console.error(`${context.component || 'Unknown'}[Task: ${context.taskId || 'unknown'}, Intervention: ${context.interventionId || 'none'}]:`, errorMessage, originalError);
  onError?.(userFriendlyMessage);
};