'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Edit,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ClientWithTasks } from '@/lib/backend';

interface ClientDetailProps {
  client: ClientWithTasks;
  loading?: boolean;
  error?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateTask?: () => void;
}

export function ClientDetail({
  client,
  loading = false,
  error,
  onEdit,
  onDelete,
  onCreateTask
}: ClientDetailProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          {client.company_name && (
            <p className="text-lg text-muted-foreground mt-1">
              {client.company_name}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={client.customer_type === 'business' ? 'default' : 'secondary'}
            className="text-sm"
          >
            {client.customer_type === 'business' ? 'Entreprise' : 'Particulier'}
          </Badge>
          
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            
            {onCreateTask && (
              <Button onClick={onCreateTask}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle tâche
              </Button>
            )}
            
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
                      {(client.tasks?.length || 0) > 0 && (
                        <span className="block mt-2 text-red-600">
                          ⚠️ Ce client a {client.tasks?.length || 0} tâche{(client.tasks?.length || 0) !== 1 ? 's' : ''} associée{(client.tasks?.length || 0) !== 1 ? 's' : ''}.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations de contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
              )}
              
               {client.phone && (
                 <div className="flex items-center gap-3">
                   <Phone className="h-4 w-4 text-muted-foreground" />
                   <span>{client.phone}</span>
                 </div>
               )}
            </CardContent>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Task History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historique des tâches ({client.tasks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(client.tasks?.length || 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune tâche pour ce client</p>
                  {onCreateTask && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={onCreateTask}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer la première tâche
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {client.tasks?.map((task, index) => (
                    <div key={task.id}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.vehicle_plate && task.vehicle_model 
                                ? `${task.vehicle_model} - ${task.vehicle_plate}`
                                : 'Véhicule non spécifié'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {getStatusLabel(task.status)}
                          </Badge>
                          <div className="text-right text-sm text-muted-foreground">
                             <p>Créée le {formatDate(task.created_at as unknown as string)}</p>
                             {task.completed_at && (
                               <p>Terminée le {formatDate(task.completed_at as unknown as string)}</p>
                             )}
                          </div>
                        </div>
                      </div>
                      {index < (client.tasks?.length || 0) - 1 && <Separator className="my-3" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant={client.customer_type === 'business' ? 'default' : 'secondary'}>
                  {client.customer_type === 'business' ? 'Entreprise' : 'Particulier'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tâches</span>
                <span className="font-medium">{client.tasks?.length || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Créé le</span>
                 <span className="font-medium">{formatDate(client.created_at as unknown as string)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modifié le</span>
                 <span className="font-medium">{formatDate(client.updated_at as unknown as string)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {client.email && (
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer un email
                </Button>
              )}
              
              {client.phone && (
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="h-4 w-4 mr-2" />
                  Appeler
                </Button>
              )}
              
              {onCreateTask && (
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
