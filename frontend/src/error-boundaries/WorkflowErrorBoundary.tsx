'use client';

import React from 'react';
import { Workflow, AlertTriangle, RefreshCw, SkipForward, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BaseErrorBoundary } from './BaseErrorBoundary';

interface WorkflowErrorBoundaryProps {
  children: React.ReactNode;
  interventionId?: string;
  currentStep?: number;
  totalSteps?: number;
  onStepSkip?: () => void;
  onWorkflowReset?: () => void;
  onSaveProgress?: () => void;
  className?: string;
}

interface WorkflowErrorFallbackProps {
  error: Error;
  interventionId?: string;
  currentStep?: number;
  totalSteps?: number;
  onRetry: () => void;
  onStepSkip?: () => void;
  onWorkflowReset?: () => void;
  onSaveProgress?: () => void;
  onGoBack: () => void;
}

// Default fallback component for workflow errors
const DefaultWorkflowErrorFallback: React.FC<WorkflowErrorFallbackProps> = ({
  error,
  interventionId,
  currentStep,
  totalSteps,
  onRetry,
  onStepSkip,
  onWorkflowReset,
  onSaveProgress,
  onGoBack
}) => {
  const getWorkflowSpecificMessage = (error: Error): { title: string; description: string; severity: 'high' | 'medium' | 'low' } => {
    const message = error.message.toLowerCase();

    if (message.includes('step validation') || message.includes('validation failed')) {
      return {
        title: 'Erreur de validation de l\'étape',
        description: 'L\'étape actuelle du workflow ne peut pas être terminée en raison de problèmes de validation. Veuillez vérifier les champs obligatoires et les photos.',
        severity: 'medium'
      };
    }

    if (message.includes('intervention not found')) {
      return {
        title: 'Intervention introuvable',
        description: 'L\'intervention PPF est introuvable. Elle a peut-être été supprimée ou corrompue.',
        severity: 'high'
      };
    }

    if (message.includes('photo upload') || message.includes('image')) {
      return {
        title: 'Erreur d\'upload de photo',
        description: 'Échec de l\'envoi ou du traitement des photos. Veuillez vérifier votre connexion et réessayer.',
        severity: 'medium'
      };
    }

    if (message.includes('geolocation') || message.includes('gps')) {
      return {
        title: 'Erreur du service de localisation',
        description: 'Impossible d\'accéder aux services de localisation. Certaines fonctionnalités du workflow peuvent être limitées.',
        severity: 'low'
      };
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Erreur de connexion',
        description: 'Impossible de synchroniser les données du workflow. Vous pouvez continuer à travailler hors ligne et synchroniser plus tard.',
        severity: 'medium'
      };
    }

    if (message.includes('timeout')) {
      return {
        title: 'Délai d\'opération dépassé',
        description: 'L\'opération du workflow prend trop de temps. Cela peut être dû à des problèmes de réseau ou à une charge élevée du serveur.',
        severity: 'medium'
      };
    }

    if (message.includes('state') || message.includes('sync')) {
      return {
        title: 'Erreur d\'état du workflow',
        description: 'L\'état du workflow est incohérent. Votre progression peut être sauvegardée, mais certaines actions devront peut-être être répétées.',
        severity: 'high'
      };
    }

    return {
      title: 'Erreur du workflow',
      description: 'Une erreur inattendue s\'est produite lors du workflow. Votre progression devrait être sauvegardée.',
      severity: 'medium'
    };
  };

  const { title, description, severity } = getWorkflowSpecificMessage(error);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className={`p-2 rounded-full ${
                severity === 'high' ? 'bg-red-100' :
                severity === 'medium' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                <Workflow className={`h-6 w-6 ${
                  severity === 'high' ? 'text-red-600' :
                  severity === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
              </div>
            </div>
            <div className="flex-1">
              <CardTitle className={`text-xl ${
                severity === 'high' ? 'text-red-600' :
                severity === 'medium' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Workflow Context */}
          {(interventionId || currentStep) && (
            <Alert className={getSeverityColor(severity)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {interventionId && (
                    <div>
                      <span className="font-medium">Intervention : </span>
                      <span className="font-mono text-sm">{interventionId}</span>
                    </div>
                  )}
                  {currentStep && totalSteps && (
                    <div>
                      <span className="font-medium">Étape actuelle : </span>
                      <span>{currentStep} sur {totalSteps}</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          <div className={`border rounded-md p-4 ${getSeverityColor(severity)}`}>
            <h4 className={`text-sm font-medium mb-2 ${
              severity === 'high' ? 'text-red-800' :
              severity === 'medium' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              Détails techniques
            </h4>
            <p className={`text-sm ${
              severity === 'high' ? 'text-red-700' :
              severity === 'medium' ? 'text-yellow-700' :
              'text-blue-700'
            }`}>
              {error.message}
            </p>
          </div>

          {/* Recovery Actions */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button onClick={onRetry} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Réessayer l'étape</span>
              </Button>

              {onSaveProgress && (
                <Button variant="outline" onClick={onSaveProgress} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Sauvegarder la progression</span>
                </Button>
              )}

              {onStepSkip && severity !== 'high' && (
                <Button variant="outline" onClick={onStepSkip} className="flex items-center space-x-2">
                  <SkipForward className="h-4 w-4" />
                  <span>Passer l'étape</span>
                </Button>
              )}
            </div>

            {severity === 'high' && onWorkflowReset && (
              <div className="border-t pt-3">
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <div className="space-y-2">
                      <p className="text-sm">
                        Il s'agit d'une erreur critique qui peut nécessiter la réinitialisation du workflow.
                        Vos étapes terminées devraient être préservées.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onWorkflowReset}
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Réinitialiser le workflow
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          {/* User Guidance */}
          <div className="text-xs text-gray-500 space-y-2">
            <p><strong>Conseils de récupération :</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Votre progression est automatiquement sauvegardée toutes les quelques minutes</li>
              <li>Les photos téléchargées avec succès sont conservées même si l'étape échoue</li>
              <li>Le suivi GPS continue en arrière-plan</li>
              <li>Vous pouvez continuer à travailler hors ligne si nécessaire</li>
            </ul>

            {severity === 'medium' && (
              <p className="mt-2">
                <strong>Note :</strong> Cette erreur est récupérable. Vous pouvez probablement continuer le workflow.
              </p>
            )}
          </div>

          {/* Back to Dashboard */}
          <div className="border-t pt-3">
            <Button variant="ghost" onClick={onGoBack} className="w-full">
              Retourner au tableau de bord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const WorkflowErrorBoundary: React.FC<WorkflowErrorBoundaryProps> = ({
  children,
  interventionId,
  currentStep,
  totalSteps,
  onStepSkip,
  onWorkflowReset,
  onSaveProgress,
  className
}) => {
  const handleWorkflowError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log workflow-specific error details
    console.error('Workflow Error Boundary caught error:', {
      interventionId,
      currentStep,
      totalSteps,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Report to monitoring service with workflow context
    if (typeof window !== 'undefined') {
      try {
        const errorReport = {
          type: 'workflow_error',
          interventionId,
          currentStep,
          totalSteps,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          workflowState: {
            step: currentStep,
            total: totalSteps,
            interventionId
          }
        };

        console.warn('Workflow error reported:', errorReport);
        // NOTE: Send to monitoring service
      } catch (reportingError) {
        console.error('Failed to report workflow error:', reportingError);
      }
    }
  };

  const handleRetry = () => {
    // Reload the current page to reset workflow state
    window.location.reload();
  };

  const handleGoBack = () => {
    // Go back to task detail or dashboard
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const taskMatch = path.match(/\/tasks\/([^\/]+)/);
      if (taskMatch) {
        window.location.href = `/tasks/${taskMatch[1]}`;
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  return (
    <BaseErrorBoundary
      onError={(error, errorInfo) => {
        handleWorkflowError(error, errorInfo);
        // Re-throw to prevent BaseErrorBoundary's fallback
        throw error;
      }}
      className={className}
    >
      <WorkflowErrorWrapper
        interventionId={interventionId}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onRetry={handleRetry}
        onStepSkip={onStepSkip}
        onWorkflowReset={onWorkflowReset}
        onSaveProgress={onSaveProgress}
        onGoBack={handleGoBack}
      >
        {children}
      </WorkflowErrorWrapper>
    </BaseErrorBoundary>
  );
};

// Wrapper component to catch errors and show workflow-specific fallback
class WorkflowErrorWrapper extends React.Component<{
  children: React.ReactNode;
  interventionId?: string;
  currentStep?: number;
  totalSteps?: number;
  onRetry: () => void;
  onStepSkip?: () => void;
  onWorkflowReset?: () => void;
  onSaveProgress?: () => void;
  onGoBack: () => void;
}, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode; interventionId?: string; currentStep?: number; totalSteps?: number; onRetry: () => void; onStepSkip?: () => void; onWorkflowReset?: () => void; onSaveProgress?: () => void; onGoBack: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Workflow wrapper caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <DefaultWorkflowErrorFallback
          error={this.state.error}
          interventionId={this.props.interventionId}
          currentStep={this.props.currentStep}
          totalSteps={this.props.totalSteps}
          onRetry={this.props.onRetry}
          onStepSkip={this.props.onStepSkip}
          onWorkflowReset={this.props.onWorkflowReset}
          onSaveProgress={this.props.onSaveProgress}
          onGoBack={this.props.onGoBack}
        />
      );
    }

    return this.props.children;
  }
}

export default WorkflowErrorBoundary;
