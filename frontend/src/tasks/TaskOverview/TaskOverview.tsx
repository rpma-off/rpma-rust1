'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Car, 
  Calendar, 
  User, 
  FileText,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskWithDetails } from '@/types/task.types';

interface TaskOverviewProps {
  task: TaskWithDetails;
}

export function TaskOverview({ task }: TaskOverviewProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Non défini';
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
    if (!timeString) return 'Non défini';
    try {
      return new Date(timeString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Heure invalide';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'termine':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
      case 'en_cours':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
      case 'termine':
        return 'Terminé';
      case 'in_progress':
      case 'en_cours':
        return 'En cours';
      case 'pending':
      case 'en_attente':
        return 'En attente';
      default:
        return 'Inconnu';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">Détails de l&apos;intervention</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Statut</span>
          <Badge 
            variant="outline" 
            className={cn("border", getStatusColor(task.status || 'pending'))}
          >
            {getStatusLabel(task.status || 'pending')}
          </Badge>
        </div>

        <Separator />

        {/* Vehicle Information */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Car className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Véhicule</span>
          </div>
          
          <div className="pl-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Modèle</span>
              <span className="text-xs font-medium">
                {task.vehicle_make ? `${task.vehicle_make} ${task.vehicle_model}` : task.vehicle_model || 'Non spécifié'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Plaque</span>
              <span className="text-xs font-medium">
                {task.vehicle_plate || 'Non spécifiée'}
              </span>
            </div>

            {task.vin && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">VIN</span>
                <span className="text-xs font-medium font-mono">
                  {task.vin}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Schedule Information */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Planification</span>
          </div>
          
          <div className="pl-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Date prévue</span>
              <span className="text-xs font-medium">
                {formatDate(task.date_rdv || task.scheduled_date)}
              </span>
            </div>
            
            {task.heure_rdv && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Heure RDV</span>
                <span className="text-xs font-medium">
                  {task.heure_rdv}
                </span>
              </div>
            )}

            {task.start_time && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Début effectif</span>
                <span className="text-xs font-medium">
                  {formatTime(task.start_time)}
                </span>
              </div>
            )}

            {task.end_time && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Fin</span>
                <span className="text-xs font-medium">
                  {formatTime(task.end_time)}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Technical Details */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Détails techniques</span>
          </div>
          
          <div className="pl-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Zone PPF</span>
              <span className="text-xs font-medium">
                {task.ppf_zones?.join(', ') || 'Non spécifiée'}
              </span>
            </div>

            {task.lot_film && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Lot de film</span>
                <span className="text-xs font-medium">
                  {task.lot_film}
                </span>
              </div>
            )}

            {task.customer_address && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Adresse</span>
                <span className="text-xs font-medium">
                  {task.customer_address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Technician Information */}
        {task.technician_id && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Technicien</span>
              </div>
              
              <div className="pl-6">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Assigné à</span>
                  <span className="text-xs font-medium">
                    {task.technician?.name || task.technician_id || 'Technicien assigné'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {task.note && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 text-sm">
                    {task.note}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        {task.note && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Notes</span>
              </div>
              <p className="text-xs text-gray-600 pl-6 leading-relaxed">
                {task.note}
              </p>
            </div>
          </>
        )}

        {/* Task ID */}
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">ID de la tâche</span>
          <span className="text-xs font-mono text-gray-400">
            {task.id?.slice(-8) || 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
