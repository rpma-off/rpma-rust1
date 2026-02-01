import { z } from 'zod';

export interface SettingsError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export class SettingsErrorHandler {
  /**
   * Maps validation errors to user-friendly messages
   */
  static handleValidationError(error: z.ZodError): SettingsError[] {
    return error.issues.map((err: any) => ({
      code: 'VALIDATION_ERROR',
      message: this.getValidationMessage(err),
      field: err.path.join('.'),
      details: {
        code: err.code,
        received: err.received,
        expected: err.expected
      }
    }));
  }

  /**
   * Maps API errors to user-friendly messages
   */
  static handleApiError(error: unknown, operation: string): SettingsError {
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.',
          details: { operation, originalError: error.message }
        };
      }

      // Authentication errors
      if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        return {
          code: 'AUTH_ERROR',
          message: 'Vous n\'avez pas les permissions nécessaires pour modifier ces paramètres.',
          details: { operation, originalError: error.message }
        };
      }

      // Validation errors from backend
      if (error.message.includes('validation')) {
        return {
          code: 'VALIDATION_ERROR',
          message: 'Les données saisies ne sont pas valides. Vérifiez vos informations.',
          details: { operation, originalError: error.message }
        };
      }

      // Conflict errors
      if (error.message.includes('conflict') || error.message.includes('duplicate')) {
        return {
          code: 'CONFLICT_ERROR',
          message: 'Ces paramètres existent déjà ou sont en conflit avec d\'autres.',
          details: { operation, originalError: error.message }
        };
      }

      // Rate limiting
      if (error.message.includes('rate') || error.message.includes('limit')) {
        return {
          code: 'RATE_LIMIT_ERROR',
          message: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
          details: { operation, originalError: error.message }
        };
      }

      // Server errors
      if (error.message.includes('500') || error.message.includes('server')) {
        return {
          code: 'SERVER_ERROR',
          message: 'Erreur du serveur. Nos équipes ont été notifiées. Veuillez réessayer plus tard.',
          details: { operation, originalError: error.message }
        };
      }

      // Generic error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Une erreur inattendue s\'est produite.',
        details: { operation, originalError: error.message }
      };
    }

    // Unknown error type
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
      details: { operation, error }
    };
  }

  /**
   * Gets user-friendly validation error messages
   */
  private static getValidationMessage(error: any): string {
    const { code, path } = error;
    const fieldName = path[path.length - 1] as string;

    switch (code) {
      case 'invalid_type':
        if (error.received === 'undefined') {
          return `${this.getFieldLabel(fieldName)} est requis.`;
        }
        return `${this.getFieldLabel(fieldName)} n'est pas du bon type.`;

      case 'too_small':
        if (typeof error.minimum === 'number') {
          return `${this.getFieldLabel(fieldName)} doit contenir au moins ${error.minimum} caractères.`;
        }
        return `${this.getFieldLabel(fieldName)} est trop petit.`;

      case 'too_big':
        if (typeof error.maximum === 'number') {
          return `${this.getFieldLabel(fieldName)} ne peut pas dépasser ${error.maximum} caractères.`;
        }
        return `${this.getFieldLabel(fieldName)} est trop grand.`;

      case 'invalid_string':
        return `${this.getFieldLabel(fieldName)} ne respecte pas le format requis.`;

      default:
        return `${this.getFieldLabel(fieldName)} n'est pas valide.`;
    }
  }

  /**
   * Gets user-friendly field labels
   */
  private static getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      // Profile fields
      full_name: 'Nom complet',
      email: 'Adresse email',
      phone: 'Téléphone',

      // Preferences fields
      theme: 'Thème',
      language: 'Langue',
      timezone: 'Fuseau horaire',
      dateFormat: 'Format de date',
      timeFormat: 'Format d\'heure',

      // Notification fields
      notifications_email: 'Notifications par email',
      push: 'Notifications push',
      sms: 'Notifications SMS',
      frequency: 'Fréquence',
      taskUpdates: 'Mises à jour des tâches',
      statusChanges: 'Changements de statut',
      overdueWarnings: 'Avertissements de retard',
      systemAlerts: 'Alertes système',
      newAssignments: 'Nouvelles assignations',
      deadlineReminders: 'Rappels d\'échéance',

      // Accessibility fields
      fontSize: 'Taille de police',
      highContrast: 'Contraste élevé',
      screenReader: 'Lecteur d\'écran',
      largeText: 'Texte agrandi',
      reducedMotion: 'Mouvement réduit',
      keyboardNavigation: 'Navigation clavier',
      colorBlindness: 'Daltonisme',
      focusIndicators: 'Indicateurs de focus',

      // Performance fields
      autoRefresh: 'Actualisation automatique',
      refreshInterval: 'Intervalle d\'actualisation',
      lazyLoading: 'Chargement différé',
      virtualScrolling: 'Défilement virtuel',
      chartAnimations: 'Animations des graphiques',
      realTimeUpdates: 'Mises à jour en temps réel',
      dataCaching: 'Cache des données',
      lowBandwidthMode: 'Mode faible bande passante',

      // Security fields
      twoFactorEnabled: 'Authentification à deux facteurs',
      sessionTimeout: 'Délai d\'expiration de session',

      // Password fields
      currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmation du mot de passe',
    };

    return labels[fieldName] || fieldName;
  }

  /**
   * Checks if an error is retryable
   */
  static isRetryableError(error: SettingsError): boolean {
    return ['NETWORK_ERROR', 'SERVER_ERROR', 'RATE_LIMIT_ERROR'].includes(error.code);
  }

  /**
   * Gets retry delay for retryable errors
   */
  static getRetryDelay(error: SettingsError, attempt: number): number {
    switch (error.code) {
      case 'RATE_LIMIT_ERROR':
        return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
      case 'NETWORK_ERROR':
        return Math.min(1000 * attempt, 5000); // Linear backoff, max 5s
      case 'SERVER_ERROR':
        return 2000 * attempt; // 2s, 4s, 6s...
      default:
        return 0;
    }
  }
}

export default SettingsErrorHandler;
