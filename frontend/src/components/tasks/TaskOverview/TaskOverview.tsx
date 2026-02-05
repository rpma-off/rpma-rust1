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
  Package,
  Mail,
  Phone,
  MapPin,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Hash,
  Tag,
  Target,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserFullName } from '@/lib/types';
import { TaskWithDetails } from '@/types/task.types';
import { Task } from '@/lib/backend';

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

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'low':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Haute';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Basse';
      default:
        return 'Non définie';
    }
  };

  const getTaskProgress = () => {
    // Calculate progress based on available data
    let progress = 0;
    let total = 0;

    if (task.photos_before && task.photos_before.length > 0) {
      progress += 1;
      total += 1;
    }
    if (task.photos_after && task.photos_after.length > 0) {
      progress += 1;
      total += 1;
    }
    if (task.checklist_items && task.checklist_items.length > 0) {
      const completedItems = task.checklist_items.filter(item => item.is_completed).length;
      progress += completedItems;
      total += task.checklist_items.length;
    }

    return total > 0 ? Math.round((progress / total) * 100) : 0;
  };

  return (
    <div className="bg-muted border border-border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <FileText className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
          <h2 className="text-xl font-semibold text-foreground">Détails de l&apos;intervention</h2>
        </div>

        {/* Task Status & Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Statut & Priorité</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge
                  variant="outline"
                  className={`px-2 py-1 text-xs font-medium ${
                    task.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                    task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                    task.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
                    'bg-gray-500/20 text-gray-300 border-gray-500/50'
                  }`}
                >
                  {task.status === 'completed' ? 'Terminée' :
                   task.status === 'in_progress' ? 'En cours' :
                   task.status === 'pending' ? 'En attente' : 'Autre'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Priorité</span>
                <Badge
                  variant="outline"
                  className={`px-2 py-1 text-xs font-medium ${getPriorityColor(task.priority || 'medium')}`}
                >
                  {getPriorityLabel(task.priority || 'medium')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Task Progress & Metrics */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Progression & Métriques</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progression</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--rpma-teal))] transition-all duration-300"
                      style={{ width: `${getTaskProgress()}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground">{getTaskProgress()}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Photos avant</span>
                <span className="text-sm font-medium text-foreground">
                  {task.photos_before?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Photos après</span>
                <span className="text-sm font-medium text-foreground">
                  {task.photos_after?.length || 0}
                </span>
              </div>
              {task.checklist_items && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Checklist</span>
                  <span className="text-sm font-medium text-foreground">
                    {task.checklist_items.filter(item => item.is_completed).length}/{task.checklist_items.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Details & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Informations générales</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ID de la tâche</span>
                <span className="text-sm font-medium text-foreground font-mono">
                  {task.id?.slice(-8) || 'N/A'}
                </span>
              </div>
              {task.ppf_zones && task.ppf_zones.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Zones PPF</span>
                  <span className="text-sm font-medium text-foreground">
                    {task.ppf_zones.length} zone{task.ppf_zones.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {task.lot_film && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lot de film</span>
                  <span className="text-sm font-medium text-foreground">
                    {task.lot_film}
                  </span>
                </div>
              )}
              {task.estimated_duration_minutes && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Durée estimée</span>
                  <span className="text-sm font-medium text-foreground">
                    {Math.round(task.estimated_duration_minutes / 60)}h
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Task Timeline */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Chronologie</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Créée le</span>
                 <span className="text-sm font-medium text-foreground">
                   {formatDate(task.created_at as unknown as string)}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground">Dernière mise Ã  jour</span>
                 <span className="text-sm font-medium text-foreground">
                   {formatDate(task.updated_at as unknown as string)}
                 </span>
              </div>
              {task.start_time && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Début effectif</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatTime(task.start_time)}
                  </span>
                </div>
              )}
              {task.end_time && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fin</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatTime(task.end_time)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Vehicle Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Véhicule</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Modèle</span>
                <span className="text-sm font-medium text-foreground">
                  {task.vehicle_make ? `${task.vehicle_make} ${task.vehicle_model}` : task.vehicle_model || 'Non spécifié'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plaque</span>
                <span className="text-sm font-medium text-foreground font-mono">
                  {task.vehicle_plate || 'Non spécifiée'}
                </span>
              </div>
              {task.vehicle_year && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Année</span>
                  <span className="text-sm font-medium text-foreground">
                    {task.vehicle_year}
                  </span>
                </div>
              )}
              {task.vin && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">VIN</span>
                  <span className="text-sm font-medium text-foreground font-mono">
                    {task.vin}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Planification de l&apos;intervention</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              {/* Planned Schedule */}
              <div className="space-y-2 pb-3 border-b border-border/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Planifié</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date RDV</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(task.date_rdv || task.scheduled_date)}
                  </span>
                </div>
                {task.heure_rdv && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Heure RDV</span>
                    <span className="text-sm font-medium text-foreground">
                      {task.heure_rdv}
                    </span>
                  </div>
                )}
                {task.estimated_duration_minutes && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Durée estimée</span>
                    <span className="text-sm font-medium text-foreground">
                      {Math.round(task.estimated_duration_minutes / 60)}h {task.estimated_duration_minutes % 60 > 0 ? `${task.estimated_duration_minutes % 60}min` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Actual Execution */}
              {(task.start_time || task.end_time) && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                    <span className="text-xs font-medium text-foreground uppercase tracking-wide">Réalisé</span>
                  </div>
                  {task.start_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Début effectif</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(task.start_time)}
                      </span>
                    </div>
                  )}
                  {task.end_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fin</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(task.end_time)}
                      </span>
                    </div>
                  )}
                  {task.start_time && task.end_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Durée réelle</span>
                      <span className="text-sm font-medium text-foreground">
                        {(() => {
                          const start = new Date(task.start_time!);
                          const end = new Date(task.end_time!);
                          const diffMs = end.getTime() - start.getTime();
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          return `${diffHours}h ${diffMinutes}min`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* No schedule information */}
              {!task.date_rdv && !task.scheduled_date && !task.heure_rdv && !task.start_time && !task.end_time && (
                <div className="text-center py-4">
                  <span className="text-sm text-muted-foreground">Aucune information de planification disponible</span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Détails techniques</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              {/* PPF Information */}
              <div className="space-y-2 pb-3 border-b border-border/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Protection PPF</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Zones</span>
                  <span className="text-sm font-medium text-foreground">
                    {task.ppf_zones?.length ? `${task.ppf_zones.length} zone${task.ppf_zones.length > 1 ? 's' : ''}` : 'Non spécifiées'}
                  </span>
                </div>
                {task.ppf_zones && task.ppf_zones.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Détail</span>
                    <span className="text-sm font-medium text-foreground text-right max-w-[60%]">
                      {task.ppf_zones.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Materials */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Tag className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Matériel</span>
                </div>
                {task.lot_film && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Lot de film</span>
                    <span className="text-sm font-medium text-foreground font-mono">
                      {task.lot_film}
                    </span>
                  </div>
                )}
                {task.customer_address && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Adresse d&apos;intervention</span>
                    <span className="text-sm font-medium text-foreground text-right max-w-[60%] leading-tight">
                      {task.customer_address}
                    </span>
                  </div>
                )}
              </div>

              {/* No technical details */}
              {!task.ppf_zones?.length && !task.lot_film && !task.customer_address && (
                <div className="text-center py-4">
                  <span className="text-sm text-muted-foreground">Aucun détail technique disponible</span>
                </div>
              )}
            </div>
          </div>

          {/* Technician Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Technicien</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              {task.technician ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nom</span>
                    <span className="text-sm font-medium text-foreground">
                      {getUserFullName(task.technician)}
                    </span>
                  </div>
                  {task.technician.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-medium text-foreground">
                        {task.technician.email}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <span className="text-sm font-medium text-foreground">
                    Non assigné
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
              <h3 className="text-sm font-medium text-foreground">Informations client</h3>
            </div>
            <div className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-3">
              {/* Business Client */}
              {task.client && (
                <div className="space-y-2 pb-3 border-b border-border/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                    <span className="text-xs font-medium text-foreground uppercase tracking-wide">Client entreprise</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nom</span>
                    <span className="text-sm font-medium text-foreground">
                      {task.client.name}
                    </span>
                  </div>
                  {task.client.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Téléphone</span>
                      <span className="text-sm font-medium text-foreground">
                        {task.client.phone}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Customer */}
              {(task.customer_name || task.customer_email || task.customer_phone || task.customer_address) && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                    <span className="text-xs font-medium text-foreground uppercase tracking-wide">Client final</span>
                  </div>

                  {task.customer_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Nom</span>
                      <span className="text-sm font-medium text-foreground">
                        {task.customer_name}
                      </span>
                    </div>
                  )}

                  {task.customer_email && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {task.customer_email}
                        </span>
                      </div>
                    </div>
                  )}

                  {task.customer_phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Téléphone</span>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {task.customer_phone}
                        </span>
                      </div>
                    </div>
                  )}

                  {task.customer_address && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Adresse</span>
                      <div className="flex items-start space-x-2 max-w-[60%]">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground text-right leading-tight">
                          {task.customer_address}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No client information */}
              {!task.client && !task.customer_name && !task.customer_email && !task.customer_phone && !task.customer_address && (
                <div className="text-center py-4">
                  <span className="text-sm text-muted-foreground">Aucune information client disponible</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
            <h3 className="text-sm font-medium text-foreground">Notes et commentaires</h3>
          </div>

          <div className="space-y-4">
            {/* Client Notes */}
            {task.client?.notes && (
              <div className="bg-background/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Notes client entreprise</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {task.client.notes}
                </p>
              </div>
            )}

            {/* Task Notes */}
            {(task.note || task.notes) && (
              <div className="bg-background/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Notes d&apos;intervention</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {task.note || task.notes}
                </p>
              </div>
            )}

            {/* Additional Notes Fields */}
            {task.description && (
              <div className="bg-background/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Description</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {task.description}
                </p>
              </div>
            )}

            {/* Customer Comments */}
            {(task as Task & { customer_comments?: string }).customer_comments && (
              <div className="bg-background/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-3 w-3 text-[hsl(var(--rpma-teal))]" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Commentaires client</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {(task as Task & { customer_comments?: string }).customer_comments}
                </p>
              </div>
            )}

            {/* Special Instructions */}
            {(task as Task & { special_instructions?: string }).special_instructions && (
              <div className="bg-background/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-medium text-foreground uppercase tracking-wide">Instructions spéciales</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {(task as Task & { special_instructions?: string }).special_instructions}
                </p>
              </div>
            )}

            {/* No notes message */}
            {!task.client?.notes && !task.note && !task.notes && !task.description && (
              <div className="bg-background/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune note ou commentaire disponible
                </p>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
