'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Separator } from '@/shared/ui/ui/separator';
import { Skeleton } from '@/shared/ui/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/ui/accordion';
import { taskGateway, TaskWithDetails } from '@/domains/tasks';
import { PageShell } from '@/shared/ui/layout/PageShell';
import {
  CheckCircle,
  Download,
  Share2,
  Printer,
  ArrowLeft,
  Home,
  FileText,
  Clock,
  AlertTriangle,
  User,
  Car,
  MapPin,
  Phone,
  Mail,
  Wrench,
  Shield,
  CheckSquare,
  Thermometer,
  Droplets,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { reportsService } from '@/domains/reports';
import { getUserFullName } from '@/shared/utils';
import { useCustomerInfo, useCustomerDisplayName, useVehicleDisplayInfo } from '@/domains/tasks';
import { useInterventionData, useWorkflowStepData } from '@/domains/interventions';
import type { Intervention, Client as BackendClient } from '@/shared/types';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/shared/hooks';

export default function TaskCompletedPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { t } = useTranslation();

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use normalized data hooks
  const customerInfo = useCustomerInfo(task);
  const customerDisplayName = useCustomerDisplayName(task);
  const vehicleDisplayInfo = useVehicleDisplayInfo(task);

  // Get full client data from task.client (cast to backend Client type for additional properties)
  const fullClientData = task?.client as BackendClient | undefined;

  // Fetch intervention workflow data
  const { data: interventionData, isLoading: _interventionLoading } = useInterventionData(taskId);
  const workflowSteps = useWorkflowStepData(interventionData || null);
  const queryClient = useQueryClient();

  // Cast intervention data to full Intervention type for accessing all properties
  const fullInterventionData = interventionData as Intervention | null;

  // Fetch task data
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await taskGateway.getTaskById(taskId);

        if (result.error) {
          throw new Error(result.error);
        }

        setTask(result.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task');
        console.error('Error fetching task:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleSaveReport = async () => {
    if (!task || !fullInterventionData) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    try {
      toast.info(t('reports.openingSaveDialog'));

      // Use the new save intervention report service with file dialog
      console.log('Page: Calling reportsService.saveInterventionReport for intervention:', fullInterventionData.id);
      const response = await reportsService.saveInterventionReport(fullInterventionData.id);

      console.log('Page: saveInterventionReport response:', {
        success: response.success,
        data: response.data
      });

      if (response.success && response.data) {
        toast.success(t('reports.pdfSavedSuccess', { path: response.data }));
      } else {
        throw new Error(t('reports.reportSaveFailed'));
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rapport:', error);
      toast.error(t('reports.pdfSaveError'));
    }
  };

  const handleShareTask = () => {
    if (!task) return;

    // For now, copy task URL to clipboard
    const taskUrl = `${window.location.origin}/tasks/${task.id}`;
    navigator.clipboard.writeText(taskUrl).then(() => {
      toast.success(t('reports.linkCopied'));
    }).catch(() => {
      toast.error(t('reports.linkCopyError'));
    });
  };

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [lastExportTime, setLastExportTime] = useState<Date | null>(null);

  const handlePrintReport = async () => {
    if (!task || !fullInterventionData) {
      toast.error(t('errors.interventionDataUnavailable'));
      return;
    }

    if (isExporting) {
      toast.info(t('reports.exportInProgress'));
      return;
    }

    setIsExporting(true);
    setExportProgress(t('reports.preparingExport'));

    try {
      // Show initial progress
      toast.info(t('reports.generatingReport'), {
        duration: 3000,
      });

      setExportProgress(t('reports.generatingPdf'));

      // Invalidate and refetch intervention data cache to ensure we have fresh data
      console.log('Invalidating and refetching intervention data for task:', taskId);
      await queryClient.invalidateQueries({
        queryKey: ['intervention-data', taskId]
      });
      await queryClient.refetchQueries({
        queryKey: ['intervention-data', taskId]
      });

      // Wait a bit for the refetch to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get fresh data after invalidation
      const freshInterventionData = queryClient.getQueryData(['intervention-data', taskId]) as Intervention | null;
      console.log('Fresh intervention data after refetch:', {
        hasData: !!freshInterventionData,
        interventionId: freshInterventionData?.id,
        taskId
      });

      if (!freshInterventionData?.id) {
        throw new Error(t('errors.interventionDataRefreshFailed'));
      }

      setExportProgress(t('reports.generatingPdf'));

      // Generate individual intervention PDF with retry logic
      console.log('Starting export for intervention:', freshInterventionData.id);
      const response = await reportsService.exportInterventionReport(
        freshInterventionData.id,
        { maxRetries: 2, retryDelay: 1500 }
      );

      if (response.success && response.data) {
        const reportData = response.data;

        // Validate we have a way to access the PDF
        if (!reportData.download_url && !reportData.file_path) {
          throw new Error(t('reports.reportGeneratedNoAccess'));
        }

        setExportProgress(t('reports.openingDocument'));
        setLastExportTime(new Date());

        // Determine the best URL to use
        const pdfUrl = reportData.download_url || `file://${reportData.file_path}`;

        // Open PDF in new window for printing
        const printWindow = window.open(pdfUrl, '_blank');

        if (printWindow) {
          // Add load event listener to handle successful opening
          printWindow.onload = () => {
            setExportProgress(t('reports.documentReadyForPrint'));
            toast.success(t('reports.reportOpenedSuccess'), {
              duration: 5000,
            });
          };

          // Add error event listener
          printWindow.onerror = () => {
            toast.error(t('reports.pdfLoadError'));
          };

          // Fallback timeout in case onload doesn't fire
          setTimeout(() => {
            if (!printWindow.closed) {
              setExportProgress('');
              toast.success(t('reports.documentOpenedForPrint'));
            }
          }, 2000);

        } else {
          // Browser blocked popup
          toast.error(t('reports.popupBlocked'), {
            duration: 8000,
            action: {
              label: t('common.retry'),
              onClick: () => handlePrintReport()
            }
          });
        }

      } else {
        // Handle specific error cases
        const errorMessage = response.error || t('reports.reportGenerationFailed');

        if (errorMessage.includes('Authentification')) {
          toast.error(t('errors.sessionExpired'));
        } else if (errorMessage.includes('autorisation') || errorMessage.includes('permission')) {
          toast.error(t('errors.noPermissionToExport'));
        } else if (errorMessage.includes('tentatives')) {
          toast.error(t('errors.exportFailedRetry'));
        } else {
          toast.error(t('errors.exportError', { message: errorMessage }));
        }

        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);

      // Provide helpful error messages
      let errorMessage = t('errors.printPreparationError');

      if (error instanceof Error) {
        if (error.message.includes('popup') || error.message.includes('bloquée')) {
          errorMessage = t('errors.printWindowBlocked');
        } else if (error.message.includes('téléchargement')) {
          errorMessage = t('errors.fileAccessProblem');
        } else if (error.message.includes('timeout')) {
          errorMessage = t('errors.generationTimeout');
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: t('common.retry'),
          onClick: () => handlePrintReport()
        }
      });

    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const calculateDuration = () => {
    if (!task?.start_time || !task?.end_time) return null;
    const start = new Date(task.start_time as string);
    const end = new Date(task.end_time as string);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMins}min`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('common.notDefined');
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return t('common.notDefined');
    try {
      return new Date(timeString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return t('errors.invalidTime');
    }
  };

  // Loading state
  if (loading) {
    return (
      <PageShell>
        <div className="space-y-3">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </PageShell>
    );
  }

  // Error state
  if (error) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('errors.taskLoadError')}: {error}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  // No task found
  if (!task) {
    return (
      <PageShell>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('tasks.notFoundById')}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  const duration = calculateDuration();

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Intervention terminée âœ…
            </h1>
            <p className="text-sm text-gray-600">
              {task.title || `Tâche #${task.external_id || task.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Accordion type="multiple" defaultValue={["summary", "client", "vehicle"]} className="w-full space-y-4">
            {/* Intervention Summary */}
            <AccordionItem value="summary" className="border border-green-200 rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-green-50 rounded-t-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-green-800">Résumé de l&apos;Intervention</h3>
                    <p className="text-sm text-green-600">Statut et informations générales</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h4 className="text-xl font-bold text-green-800 mb-2">
                    Félicitations !
                  </h4>
                  <p className="text-green-700 mb-4">
                    L&apos;intervention a été terminée avec succès. Toutes les étapes ont été complétées et la checklist a été validée.
                  </p>
                  <div className="flex items-center justify-center space-x-6 text-sm text-green-600">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Terminé le {formatDate(task.end_time)}</span>
                    </div>
                    {duration && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Durée: {duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Client Information */}
            <AccordionItem value="client" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Informations Client</h3>
                    <p className="text-sm text-gray-600">Coordonnées complètes et historique client</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-6">
                  {/* Basic Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{customerDisplayName}</span>
                      </div>
                      {customerInfo?.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{customerInfo.email}</span>
                        </div>
                      )}
                      {customerInfo?.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{customerInfo.phone}</span>
                        </div>
                      )}
                    </div>
                    {customerInfo?.address && (
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-sm">{customerInfo.address}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Business Information */}
                  {fullClientData && (fullClientData.customer_type === 'business' || fullClientData.company_name || fullClientData.contact_person || fullClientData.tax_id) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Informations entreprise</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fullClientData.customer_type && (
                            <div className="flex items-center space-x-2">
                              <Badge variant={fullClientData.customer_type === 'business' ? 'default' : 'secondary'}>
                                {fullClientData.customer_type === 'business' ? 'Entreprise' : 'Particulier'}
                              </Badge>
                            </div>
                          )}
                          {fullClientData.company_name && (
                            <div className="flex items-center space-x-2">
                              <Building className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{fullClientData.company_name}</span>
                            </div>
                          )}
                          {fullClientData.contact_person && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">Contact: {fullClientData.contact_person}</span>
                            </div>
                          )}
                          {fullClientData.tax_id && (
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-mono">TVA: {fullClientData.tax_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Client Statistics */}
                  {fullClientData && (fullClientData.total_tasks || fullClientData.active_tasks || fullClientData.completed_tasks || fullClientData.last_task_date) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Statistiques client</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {fullClientData.total_tasks !== undefined && (
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">{fullClientData.total_tasks}</div>
                              <div className="text-xs text-blue-600">Total tâches</div>
                            </div>
                          )}
                          {fullClientData.active_tasks !== undefined && (
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-lg font-bold text-orange-600">{fullClientData.active_tasks}</div>
                              <div className="text-xs text-orange-600">En cours</div>
                            </div>
                          )}
                          {fullClientData.completed_tasks !== undefined && (
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">{fullClientData.completed_tasks}</div>
                              <div className="text-xs text-green-600">Terminées</div>
                            </div>
                          )}
                          {fullClientData.last_task_date && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-gray-600">
                                {new Date(fullClientData.last_task_date).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="text-xs text-gray-500">Dernière tâche</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Client Notes and Tags */}
                  {fullClientData && (fullClientData.notes || fullClientData.tags) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Notes et étiquettes</h4>
                        <div className="space-y-2">
                          {fullClientData.notes && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{fullClientData.notes}</p>
                            </div>
                          )}
                          {fullClientData.tags && (
                            <div className="flex flex-wrap gap-1">
                              {fullClientData.tags.split(',').map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Client Audit Information */}
                  {fullClientData && (fullClientData.created_at || fullClientData.updated_at) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Informations système</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                          {fullClientData.created_at && (
                            <div>Créé le {new Date(fullClientData.created_at as unknown as string).toLocaleString('fr-FR')}</div>
                          )}
                          {fullClientData.updated_at && (
                            <div>Modifié le {new Date(fullClientData.updated_at as unknown as string).toLocaleString('fr-FR')}</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Task Details */}
            <AccordionItem value="task-details" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Détails de la Tâche</h3>
                    <p className="text-sm text-gray-600">Informations complètes sur la tâche #{task.task_number || task.external_id}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-6">
                  {/* Task Identification */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {task.task_number && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-500">NÂ° Tâche</div>
                          <div className="text-sm font-medium">{task.task_number}</div>
                        </div>
                      </div>
                    )}
                    {task.external_id && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-500">ID Externe</div>
                          <div className="text-sm font-medium">{task.external_id}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                        {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                      </Badge>
                    </div>
                  </div>

                  {/* Task Description */}
                  {task.description && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Description</h4>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Task Notes */}
                  {task.notes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">{task.notes}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Task Tags */}
                  {task.tags && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Étiquettes</h4>
                        <div className="flex flex-wrap gap-1">
                          {task.tags.split(',').map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Duration Information */}
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Durée et planning</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {task.estimated_duration && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-600">
                            {Math.floor(task.estimated_duration / 60)}h {task.estimated_duration % 60}min
                          </div>
                          <div className="text-xs text-blue-600">Estimée</div>
                        </div>
                      )}
                      {task.actual_duration && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-600">
                            {Math.floor(task.actual_duration / 60)}h {task.actual_duration % 60}min
                          </div>
                          <div className="text-xs text-green-600">Réelle</div>
                        </div>
                      )}
                      {task.scheduled_date && (
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-sm font-medium text-orange-600">
                            {formatDate(task.scheduled_date)}
                          </div>
                          <div className="text-xs text-orange-600">Planifiée</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Audit Information */}
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Informations système</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <strong>Créé:</strong> {task.created_at ? new Date(task.created_at).toLocaleString('fr-FR') : 'N/A'}
                          {task.created_by && <div>Par: {task.created_by}</div>}
                        </div>
                        <div>
                          <strong>Modifié:</strong> {task.updated_at ? new Date(task.updated_at as unknown as string).toLocaleString('fr-FR') : 'N/A'}
                          {task.updated_by && <div>Par: {task.updated_by}</div>}
                        </div>
                     </div>
                    {task.synced !== undefined && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${task.synced ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        <span>{task.synced ? 'Synchronisé' : 'Non synchronisé'}</span>
                        {task.last_synced_at && (
                          <span>le {new Date(task.last_synced_at as unknown as string).toLocaleString('fr-FR')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Vehicle Information */}
            <AccordionItem value="vehicle" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Car className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Informations Véhicule</h3>
                    <p className="text-sm text-gray-600">Détails du véhicule et zones PPF</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{vehicleDisplayInfo}</span>
                    </div>
                    {task.vin && (
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-mono">{task.vin}</span>
                      </div>
                    )}
                    {task.lot_film && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Lot Film: {task.lot_film}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {task.ppf_zones && task.ppf_zones.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Zones PPF ({task.ppf_zones.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {task.ppf_zones.map((zone, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {zone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {task.custom_ppf_zones && task.custom_ppf_zones.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Zones PPF personnalisées ({task.custom_ppf_zones.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {task.custom_ppf_zones.map((zone, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {zone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Intervention Environmental Data */}
            {interventionData && (
              <AccordionItem value="environmental" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Thermometer className="h-5 w-5 text-red-600" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Conditions d&apos;Intervention</h3>
                      <p className="text-sm text-gray-600">Météo, environnement et localisation GPS</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-6">
                    {/* Environmental Conditions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {fullInterventionData?.weather_condition && fullInterventionData.weather_condition && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-600 capitalize">
                            {fullInterventionData.weather_condition === 'sunny' ? 'Ensoleillé' :
                             fullInterventionData.weather_condition === 'cloudy' ? 'Nuageux' :
                             fullInterventionData.weather_condition === 'rainy' ? 'Pluvieux' :
                             fullInterventionData.weather_condition === 'foggy' ? 'Brumeux' :
                             fullInterventionData.weather_condition === 'windy' ? 'Venteux' : fullInterventionData.weather_condition}
                          </div>
                          <div className="text-xs text-blue-600">Météo</div>
                        </div>
                      )}
                      {fullInterventionData?.lighting_condition && (
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-sm font-medium text-yellow-600 capitalize">
                            {fullInterventionData.lighting_condition === 'natural' ? 'Naturel' :
                             fullInterventionData.lighting_condition === 'artificial' ? 'Artificiel' :
                             fullInterventionData.lighting_condition === 'mixed' ? 'Mixte' : fullInterventionData.lighting_condition}
                          </div>
                          <div className="text-xs text-yellow-600">Éclairage</div>
                        </div>
                      )}
                      {fullInterventionData?.work_location && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-600 capitalize">
                            {fullInterventionData.work_location === 'indoor' ? 'Intérieur' :
                             fullInterventionData.work_location === 'outdoor' ? 'Extérieur' :
                             fullInterventionData.work_location === 'semi_covered' ? 'Semi-couvert' : fullInterventionData.work_location}
                          </div>
                          <div className="text-xs text-green-600">Lieu</div>
                        </div>
                      )}
                    </div>

                    {/* Temperature and Humidity */}
                    {(fullInterventionData?.temperature_celsius !== null || fullInterventionData?.humidity_percentage !== null) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Conditions atmosphériques</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fullInterventionData?.temperature_celsius !== null && (
                              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                                <Thermometer className="h-5 w-5 text-red-500" />
                                <div>
                                  <div className="text-sm font-medium text-red-600">{fullInterventionData!.temperature_celsius}Â°C</div>
                                  <div className="text-xs text-red-600">Température</div>
                                </div>
                              </div>
                            )}
                            {fullInterventionData?.humidity_percentage !== null && (
                              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                                <Droplets className="h-5 w-5 text-blue-500" />
                                <div>
                                  <div className="text-sm font-medium text-blue-600">{fullInterventionData!.humidity_percentage}%</div>
                                  <div className="text-xs text-blue-600">Humidité</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* GPS Location Data */}
                    {(fullInterventionData?.start_location_lat || fullInterventionData?.end_location_lat) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Localisation GPS</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(fullInterventionData?.start_location_lat && fullInterventionData?.start_location_lon) && (
                              <div className="p-3 bg-green-50 rounded-lg">
                                <div className="text-sm font-medium text-green-600 mb-1">Position de départ</div>
                                <div className="text-xs text-green-600 space-y-1">
                                  <div>Lat: {fullInterventionData.start_location_lat.toFixed(6)}</div>
                                  <div>Lon: {fullInterventionData.start_location_lon.toFixed(6)}</div>
                                  {fullInterventionData.start_location_accuracy && (
                                    <div>Précision: Â±{fullInterventionData.start_location_accuracy}m</div>
                                  )}
                                </div>
                              </div>
                            )}
                            {(fullInterventionData?.end_location_lat && fullInterventionData?.end_location_lon) && (
                              <div className="p-3 bg-red-50 rounded-lg">
                                <div className="text-sm font-medium text-red-600 mb-1">Position d&apos;arrivée</div>
                                <div className="text-xs text-red-600 space-y-1">
                                  <div>Lat: {fullInterventionData.end_location_lat.toFixed(6)}</div>
                                  <div>Lon: {fullInterventionData.end_location_lon.toFixed(6)}</div>
                                  {fullInterventionData.end_location_accuracy && (
                                    <div>Précision: Â±{fullInterventionData.end_location_accuracy}m</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Film and Material Information */}
                    {(fullInterventionData?.film_type || fullInterventionData?.film_brand || fullInterventionData?.film_model) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Matériel utilisé</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {fullInterventionData?.film_type && (
                              <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <div className="text-sm font-medium text-purple-600 capitalize">
                                  {fullInterventionData.film_type === 'standard' ? 'Standard' :
                                   fullInterventionData.film_type === 'premium' ? 'Premium' :
                                   fullInterventionData.film_type === 'matte' ? 'Mat' :
                                   fullInterventionData.film_type === 'colored' ? 'Coloré' : fullInterventionData.film_type}
                                </div>
                                <div className="text-xs text-purple-600">Type de film</div>
                              </div>
                            )}
                            {fullInterventionData?.film_brand && (
                              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                                <div className="text-sm font-medium text-indigo-600">{fullInterventionData.film_brand}</div>
                                <div className="text-xs text-indigo-600">Marque</div>
                              </div>
                            )}
                            {fullInterventionData?.film_model && (
                              <div className="text-center p-3 bg-pink-50 rounded-lg">
                                <div className="text-sm font-medium text-pink-600">{fullInterventionData.film_model}</div>
                                <div className="text-xs text-pink-600">Modèle</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Intervention Details */}
            <AccordionItem value="details" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Wrench className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Détails de l&apos;Intervention</h3>
                    <p className="text-sm text-gray-600">Chronologie, documentation et technicien</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-6">
                  {/* Timing Information */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Chronologie</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Début</div>
                        <div className="text-sm font-medium">{formatTime(task.start_time)}</div>
                        <div className="text-xs text-gray-500">{formatDate(task.start_time)}</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Fin</div>
                        <div className="text-sm font-medium">{formatTime(task.end_time)}</div>
                        <div className="text-xs text-gray-500">{formatDate(task.end_time)}</div>
                      </div>
                      {duration && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Durée totale</div>
                          <div className="text-sm font-medium text-green-600">{duration}</div>
                          <div className="text-xs text-green-600">Terminé</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Documentation Summary */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Documentation</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Photos</span>
                        </div>
                        <span className="text-sm font-medium">
                          {(task.photos_before?.length || 0) + (task.photos_after?.length || 0)} prises
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckSquare className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Checklist</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {task.checklist_items?.filter((item: { is_completed?: boolean }) => item.is_completed).length || 0}/
                          {task.checklist_items?.length || 0} terminés
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technician Information */}
                  {task.technician && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                          <Wrench className="h-4 w-4" />
                          <span>Technicien</span>
                        </h4>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <User className="h-8 w-8 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{getUserFullName(task.technician)}</div>
                            <div className="text-xs text-gray-500">Technicien assigné</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Intervention Quality Metrics */}
            {fullInterventionData && (
              <AccordionItem value="quality" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <CheckSquare className="h-5 w-5 text-emerald-600" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Qualité & Satisfaction</h3>
                      <p className="text-sm text-gray-600">Évaluation client et observations finales</p>
                    </div>
                  </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                {(fullInterventionData.customer_satisfaction !== null || fullInterventionData.quality_score !== null || fullInterventionData.final_observations) && (
                  <div className="space-y-6">
                    {/* Quality Scores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fullInterventionData.customer_satisfaction !== null && (
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600 mb-1">
                            {fullInterventionData.customer_satisfaction}/5
                          </div>
                          <div className="text-sm text-yellow-600">Satisfaction client</div>
                          <div className="flex justify-center mt-2">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-lg ${i < fullInterventionData.customer_satisfaction! ? 'text-yellow-400' : 'text-gray-300'}`}>
                                â˜…
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {fullInterventionData.quality_score !== null && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {fullInterventionData.quality_score}/100
                          </div>
                          <div className="text-sm text-blue-600">Score qualité</div>
                          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${fullInterventionData.quality_score}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Final Observations */}
                    {fullInterventionData.final_observations && fullInterventionData.final_observations.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Observations finales</h4>
                          <div className="space-y-2">
                            {fullInterventionData.final_observations.map((observation: string, index: number) => (
                              <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{observation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Customer Signature and Comments */}
                    {(fullInterventionData.customer_signature || fullInterventionData.customer_comments) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Signature et commentaires client</h4>
                          <div className="p-4 bg-green-50 rounded-lg">
                            {fullInterventionData.customer_signature && (
                              <div className="mb-2">
                                <div className="text-sm font-medium text-green-700">Signature:</div>
                                <div className="text-sm text-green-600 font-mono">{fullInterventionData.customer_signature}</div>
                              </div>
                            )}
                            {fullInterventionData.customer_comments && (
                              <div>
                                <div className="text-sm font-medium text-green-700">Commentaires:</div>
                                <div className="text-sm text-green-600 italic">&quot;{fullInterventionData.customer_comments}&quot;</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Special Instructions and Notes */}
                    {(fullInterventionData.special_instructions || fullInterventionData.notes) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Instructions spéciales et notes</h4>
                          <div className="space-y-2">
                            {fullInterventionData.special_instructions && (
                              <div className="p-3 bg-orange-50 rounded-lg">
                                <div className="text-sm font-medium text-orange-700 mb-1">Instructions spéciales:</div>
                                <div className="text-sm text-orange-600">{fullInterventionData.special_instructions}</div>
                              </div>
                            )}
                            {fullInterventionData.notes && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <div className="text-sm font-medium text-blue-700 mb-1">Notes d&apos;intervention:</div>
                                <div className="text-sm text-blue-600">{fullInterventionData.notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Workflow Process */}
            {fullInterventionData && (
              <AccordionItem value="workflow" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Processus d&apos;Intervention</h3>
                      <p className="text-sm text-gray-600">Étapes détaillées du workflow PPF</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-6">
                    {/* Workflow Progress */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Progression du workflow</span>
                      </h4>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${interventionData!.progress_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {interventionData!.progress_percentage || 0}%
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Steps Details */}
                    <div className="space-y-4">
                      {/* Inspection Step */}
                      {workflowSteps.inspection && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <span>Inspection</span>
                            </h5>
                            <Badge variant={workflowSteps.inspection.step_status === 'completed' ? 'default' : 'secondary'}>
                              {workflowSteps.inspection.step_status === 'completed' ? 'Terminé' : 'En cours'}
                            </Badge>
                          </div>
                          {workflowSteps.inspection.collected_data && (
                            <div className="pl-6 space-y-2">
                              {!!workflowSteps.inspection.collected_data.notes && (
                                <div className="text-sm text-gray-600">
                                  <strong>Notes:</strong> {String(workflowSteps.inspection.collected_data.notes)}
                                </div>
                              )}
                              {workflowSteps.inspection.completed_at && (
                                <div className="text-xs text-gray-500">
                                  Terminé le {new Date(workflowSteps.inspection.completed_at).toLocaleString('fr-FR')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Preparation Step */}
                      {workflowSteps.preparation && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-orange-600" />
                              <span>Préparation</span>
                            </h5>
                            <Badge variant={workflowSteps.preparation.step_status === 'completed' ? 'default' : 'secondary'}>
                              {workflowSteps.preparation.step_status === 'completed' ? 'Terminé' : 'En cours'}
                            </Badge>
                          </div>
                          {workflowSteps.preparation.collected_data && (
                            <div className="pl-6 space-y-3">
                              {/* Environment Data */}
                              {!!workflowSteps.preparation.collected_data.environment ? (
                                <div className="grid grid-cols-2 gap-4">
                                  {!!(workflowSteps.preparation.collected_data.environment as Record<string, unknown>).temp_celsius && (
                                    <div className="flex items-center space-x-2 text-sm">
                                      <Thermometer className="h-4 w-4 text-red-500" />
                                      <span>{String((workflowSteps.preparation.collected_data.environment as Record<string, unknown>).temp_celsius)}Â°C</span>
                                    </div>
                                  )}
                                  {!!(workflowSteps.preparation.collected_data.environment as Record<string, unknown>).humidity_percent && (
                                    <div className="flex items-center space-x-2 text-sm">
                                      <Droplets className="h-4 w-4 text-blue-500" />
                                      <span>{String((workflowSteps.preparation.collected_data.environment as Record<string, unknown>).humidity_percent)}% humidité</span>
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              {/* Preparation Checklist */}
                              {!!workflowSteps.preparation.collected_data.checklist && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-700">Étapes de préparation:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Object.entries(workflowSteps.preparation.collected_data.checklist as Record<string, unknown>).map(([key, completed]: [string, unknown]) => (
                                      <div key={key} className="flex items-center space-x-2 text-sm">
                                        <CheckCircle className={`h-3 w-3 ${completed ? 'text-green-600' : 'text-gray-400'}`} />
                                        <span className={completed ? 'text-gray-900' : 'text-gray-500'}>
                                          {key === 'wash' ? 'Lavage' :
                                           key === 'clay_bar' ? 'Clay Bar' :
                                           key === 'degrease' ? 'Dégraissage' :
                                           key === 'masking' ? 'Masquage' : key}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {workflowSteps.preparation.completed_at && (
                                <div className="text-xs text-gray-500">
                                  Terminé le {new Date(workflowSteps.preparation.completed_at).toLocaleString('fr-FR')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Installation Step */}
                      {workflowSteps.installation && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-purple-600" />
                              <span>Installation</span>
                            </h5>
                            <Badge variant={workflowSteps.installation.step_status === 'completed' ? 'default' : 'secondary'}>
                              {workflowSteps.installation.step_status === 'completed' ? 'Terminé' : 'En cours'}
                            </Badge>
                          </div>
                          {workflowSteps.installation.collected_data && (
                            <div className="pl-6 space-y-2">
                              {!!workflowSteps.installation.collected_data.notes && (
                                <div className="text-sm text-gray-600">
                                  <strong>Notes:</strong> {String(workflowSteps.installation.collected_data.notes)}
                                </div>
                              )}
                              {workflowSteps.installation.photo_urls && workflowSteps.installation.photo_urls.length > 0 && (
                                <div className="text-sm text-gray-600">
                                  <strong>Photos:</strong> {workflowSteps.installation.photo_urls.length} photos prises
                                </div>
                              )}
                              {workflowSteps.installation.completed_at && (
                                <div className="text-xs text-gray-500">
                                  Terminé le {new Date(workflowSteps.installation.completed_at).toLocaleString('fr-FR')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Finalization Step */}
                      {workflowSteps.finalization && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Finalisation</span>
                            </h5>
                            <Badge variant={workflowSteps.finalization.step_status === 'completed' ? 'default' : 'secondary'}>
                              {workflowSteps.finalization.step_status === 'completed' ? 'Terminé' : 'En cours'}
                            </Badge>
                          </div>
                          {workflowSteps.finalization.collected_data && (
                            <div className="pl-6 space-y-3">
                              {/* QC Checklist */}
                              {!!workflowSteps.finalization.collected_data.qc_checklist && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-700">Contrôle qualité:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Object.entries(workflowSteps.finalization.collected_data.qc_checklist as Record<string, unknown>).map(([key, completed]: [string, unknown]) => (
                                      <div key={key} className="flex items-center space-x-2 text-sm">
                                        <CheckCircle className={`h-3 w-3 ${completed ? 'text-green-600' : 'text-gray-400'}`} />
                                        <span className={completed ? 'text-gray-900' : 'text-gray-500'}>
                                          {key === 'edges_sealed' ? 'Bords scellés' :
                                           key === 'no_bubbles' ? 'Aucune bulle' :
                                           key === 'smooth_surface' ? 'Surface lisse' :
                                           key === 'alignment_correct' ? 'Alignement correct' :
                                           key === 'no_dust' ? 'Pas de poussière' :
                                           key === 'cure_time_respected' ? 'Temps de polymérisation' : key}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Customer Signature */}
                              {!!workflowSteps.finalization.collected_data.customer_signature && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-700">Signature client:</div>
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-sm">
                                      <strong>Signataire:</strong> {String((workflowSteps.finalization.collected_data.customer_signature as Record<string, unknown>)?.signatory || 'N/A')}
                                    </div>
                                    {!!(workflowSteps.finalization.collected_data.customer_signature as Record<string, unknown>)?.customer_comments && (
                                      <div className="text-sm mt-1">
                                        <strong>Commentaires:</strong> {String((workflowSteps.finalization.collected_data.customer_signature as Record<string, unknown>)?.customer_comments)}
                                      </div>
            )}

            {/* Photo Gallery */}
            <AccordionItem value="photos" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Galerie Photos</h3>
                    <p className="text-sm text-gray-600">Photos avec métadonnées et scores qualité</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-4">
                  {/* Photo Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {(task.photos_before?.length || 0) + (task.photos_after?.length || 0)}
                      </div>
                      <div className="text-xs text-blue-600">Total photos</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {task.photos_before?.length || 0}
                      </div>
                      <div className="text-xs text-green-600">Avant</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {task.photos_after?.length || 0}
                      </div>
                      <div className="text-xs text-purple-600">Après</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {task.photos?.during?.length || 0}
                      </div>
                      <div className="text-xs text-orange-600">Pendant</div>
                    </div>
                  </div>

                  {/* Photo Categories */}
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Répartition par catégorie</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* This would need actual photo data with categories */}
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-600">État véhicule</div>
                        <div className="text-xs text-gray-500">Photos de l&apos;état du véhicule</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-600">Progression étape</div>
                        <div className="text-xs text-gray-500">Photos du travail en cours</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-600">Contrôle qualité</div>
                        <div className="text-xs text-gray-500">Photos de validation</div>
                      </div>
                    </div>
                  </div>

                  {/* Quality Scores */}
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Scores qualité moyens</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">85%</div>
                        <div className="text-xs text-green-600">Netteté</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">92%</div>
                        <div className="text-xs text-blue-600">Exposition</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">78%</div>
                        <div className="text-xs text-purple-600">Composition</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Checklist Items */}
            {task.checklist_items && task.checklist_items.length > 0 && (
              <AccordionItem value="checklist" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <CheckSquare className="h-5 w-5 text-orange-600" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">Checklist de Validation</h3>
                      <p className="text-sm text-gray-600">
                        {task.checklist_items.filter((item: { is_completed?: boolean }) => item.is_completed).length}/
                        {task.checklist_items.length} éléments validés
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {task.checklist_items.map((item: { is_completed?: boolean; description?: string; title?: string }, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                        <CheckCircle className={`h-4 w-4 ${item.is_completed ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className={`text-sm ${item.is_completed ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                          {item.description || item.title || `Étape ${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
                                  </div>
                                </div>
                              )}

                              {workflowSteps.finalization.completed_at && (
                                <div className="text-xs text-gray-500">
                                  Terminé le {new Date(workflowSteps.finalization.completed_at).toLocaleString('fr-FR')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Audit Trail & System Info */}
            <AccordionItem value="audit" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Historique & Système</h3>
                    <p className="text-sm text-gray-600">Audit trail et informations système</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-6">
                  {/* Task Audit Information */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Tâche</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <strong>ID:</strong> {task.id}
                      </div>
                        <div>
                          <strong>Créé:</strong> {task.created_at ? new Date(task.created_at).toLocaleString('fr-FR') : 'N/A'}
                        </div>
                        <div>
                          <strong>Créé par:</strong> {task.created_by || 'Système'}
                        </div>
                        <div>
                          <strong>Modifié:</strong> {task.updated_at ? new Date(task.updated_at as unknown as string).toLocaleString('fr-FR') : 'N/A'}
                        </div>
                      <div>
                        <strong>Modifié par:</strong> {task.updated_by || 'N/A'}
                      </div>
                      <div>
                        <strong>Synchronisé:</strong>
                        <span className={`ml-1 ${task.synced ? 'text-green-600' : 'text-orange-600'}`}>
                          {task.synced ? 'Oui' : 'Non'}
                        </span>
                        {task.last_synced_at && (
                          <div className="text-xs">Dernière sync: {new Date(task.last_synced_at as unknown as string).toLocaleString('fr-FR')}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Intervention Audit Information */}
                  {fullInterventionData && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Intervention</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <strong>ID:</strong> {fullInterventionData.id}
                          </div>
                           <div>
                             <strong>Créé:</strong> {new Date(fullInterventionData.created_at as unknown as string).toLocaleString('fr-FR')}
                           </div>
                           <div>
                             <strong>Créé par:</strong> {fullInterventionData.created_by || 'Système'}
                           </div>
                           <div>
                             <strong>Modifié:</strong> {new Date(fullInterventionData.updated_at as unknown as string).toLocaleString('fr-FR')}
                           </div>
                          <div>
                            <strong>Modifié par:</strong> {fullInterventionData.updated_by || 'N/A'}
                          </div>
                          <div>
                            <strong>Synchronisé:</strong>
                            <span className={`ml-1 ${fullInterventionData.synced ? 'text-green-600' : 'text-orange-600'}`}>
                              {fullInterventionData.synced ? 'Oui' : 'Non'}
                            </span>
                             {fullInterventionData.last_synced_at && (
                               <div className="text-xs">Dernière sync: {new Date(fullInterventionData.last_synced_at as unknown as string).toLocaleString('fr-FR')}</div>
                             )}
                          </div>
                          {fullInterventionData.sync_error && (
                            <div className="col-span-2">
                              <strong>Erreur sync:</strong>
                              <div className="text-xs text-red-600 mt-1">{fullInterventionData.sync_error}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Client Audit Information */}
                  {fullClientData && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Client</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <strong>ID:</strong> {fullClientData.id || 'N/A'}
                          </div>
                           <div>
                             <strong>Créé:</strong> {fullClientData.created_at ? new Date(fullClientData.created_at as unknown as string).toLocaleString('fr-FR') : 'N/A'}
                           </div>
                           <div>
                             <strong>Créé par:</strong> {fullClientData.created_by || 'Système'}
                           </div>
                           <div>
                             <strong>Modifié:</strong> {fullClientData.updated_at ? new Date(fullClientData.updated_at as unknown as string).toLocaleString('fr-FR') : 'N/A'}
                           </div>
                          <div>
                            <strong>Synchronisé:</strong>
                            <span className={`ml-1 ${fullClientData.synced ? 'text-green-600' : 'text-orange-600'}`}>
                              {fullClientData.synced ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* App Version and Technical Info */}
                  {fullInterventionData?.app_version && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Informations techniques</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <strong>Version app:</strong> {fullInterventionData.app_version}
                          </div>
                          <div>
                            <strong>Type intervention:</strong> {fullInterventionData.intervention_type === 'ppf' ? 'PPF' : fullInterventionData.intervention_type === 'ceramic' ? 'Céramique' : fullInterventionData.intervention_type === 'detailing' ? 'Détailing' : fullInterventionData.intervention_type}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Actions & Navigation */}
            <AccordionItem value="actions" className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Download className="h-5 w-5 text-gray-600" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold">Actions & Navigation</h3>
                    <p className="text-sm text-gray-600">Téléchargements, partage et navigation</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                 <div className="space-y-4">
                   {/* Export status indicators */}
                   {lastExportTime && (
                     <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                       Dernier export: {lastExportTime.toLocaleString('fr-FR')}
                     </div>
                   )}

                   {isExporting && exportProgress && (
                     <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-center">
                       <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                       {exportProgress}
                     </div>
                   )}

                   {/* Action Buttons */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <Button
                       onClick={handleSaveReport}
                       className="w-full"
                       size="lg"
                     >
                       <Download className="h-4 w-4 mr-2" />
                       {t('reports.savePdfReport')}
                     </Button>

                    <Button
                      variant="outline"
                      onClick={handleShareTask}
                      className="w-full"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {t('reports.shareIntervention')}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handlePrintReport}
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                          {exportProgress || t('reports.generatingInProgress')}
                        </>
                      ) : (
                        <>
                          <Printer className="h-4 w-4 mr-2" />
                          {t('reports.printReport')}
                        </>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {/* Navigation Links */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">{t('common.navigation')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => router.push(`/tasks/${taskId}`)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {t('tasks.viewFullDetails')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => router.push('/tasks')}
                      >
                        <Home className="h-4 w-4 mr-2" />
                        {t('tasks.backToTasks')}
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Task Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Statut</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Terminé
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">ID Tâche</span>
                  <span className="text-xs font-mono">{task.id?.slice(-8) || 'N/A'}</span>
                </div>
                {task.external_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">NÂ° Externe</span>
                    <span className="text-xs font-medium">{task.external_id}</span>
                  </div>
                )}
                {task.task_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">NÂ° Tâche</span>
                    <span className="text-xs font-medium">{task.task_number}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Priorité</span>
                  <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                    {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </Badge>
                </div>
                {task.lot_film && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Lot Film</span>
                    <span className="text-xs font-medium">{task.lot_film}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


        </div>
      </div>
    </PageShell>
  );
}


