'use client';

import React from 'react';
import {
  AlertTriangle,
  Building,
  Calendar,
  Car,
  Clock,
  Edit3,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import type { UpdateTaskRequest } from '@/lib/backend';
import { Badge } from '@/components/ui/badge';
import { taskPriorityLabels } from '@/lib/i18n/status-labels';
import { getUserFullName } from '@/lib/types';
import {
  InlineEditableDate,
  InlineEditableSelect,
  InlineEditableText,
  InlineEditableTextarea,
  InlineEditableTime,
} from '@/shared/ui/inline-edit';
import type { TaskWithDetails } from '@/types/task.types';

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending', label: 'En attente' },
  { value: 'scheduled', label: 'Planifiée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'on_hold', label: 'En pause' },
  { value: 'cancelled', label: 'Annulée' },
];

export function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    case 'low':
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
  }
}

export function getPriorityLabel(priority: string): string {
  return taskPriorityLabels[priority?.toLowerCase()] || 'Non définie';
}

export const SectionHeader = ({
  icon: Icon,
  title,
  onEdit,
}: {
  icon: React.ElementType;
  title: string;
  onEdit?: () => void;
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <Edit3 className="h-3 w-3" />
        Modifier
      </button>
    )}
  </div>
);

export const InfoRow = ({
  label,
  children,
  value,
  className = '',
}: {
  label: string;
  children?: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex items-start justify-between gap-4 text-sm ${className}`}>
    <dt className="shrink-0 text-muted-foreground">{label}</dt>
    <dd className="flex-1 text-right font-medium text-foreground">{children || value}</dd>
  </div>
);

export function ExpandableText({
  value,
  sectionKey,
  expanded,
  onToggle,
}: {
  value: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (section: string) => void;
}) {
  const isLongText = value.length > 150;

  return (
    <div>
      <p className={`text-sm leading-relaxed text-muted-foreground ${!expanded ? 'line-clamp-3' : ''}`}>
        {value}
      </p>
      {isLongText && (
        <button
          type="button"
          onClick={() => onToggle(sectionKey)}
          className="mt-2 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}

interface OverviewSectionProps {
  task: TaskWithDetails;
  canEdit: (field: string) => boolean;
  getDisabledReason: (field: string) => string | undefined;
  handleVehicleFieldEdit: (field: 'vehicle_plate' | 'vehicle_make' | 'vehicle_model' | 'vehicle_year' | 'vin', value: string) => Promise<boolean>;
  handleScheduleFieldEdit: (field: 'scheduled_date' | 'start_time' | 'end_time', value: string) => Promise<boolean>;
  editField: <K extends keyof UpdateTaskRequest>(field: K, value: UpdateTaskRequest[K]) => Promise<boolean>;
  completedChecklistCount: number;
}

export function VehicleAndPlanningSection({
  task,
  canEdit,
  getDisabledReason,
  handleVehicleFieldEdit,
  handleScheduleFieldEdit,
  editField,
  completedChecklistCount,
}: OverviewSectionProps) {
  return (
    <>
      <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
        <SectionHeader icon={Car} title="Véhicule" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <InfoRow label="Marque">
              <InlineEditableText
                value={task.vehicle_make}
                onSave={(value) => handleVehicleFieldEdit('vehicle_make', value)}
                fieldName="vehicle_make"
                isDisabled={!canEdit('vehicle_make')}
                disabledReason={getDisabledReason('vehicle_make')}
                placeholder="Non défini"
              />
            </InfoRow>
            <InfoRow label="Modèle">
              <InlineEditableText
                value={task.vehicle_model}
                onSave={(value) => handleVehicleFieldEdit('vehicle_model', value)}
                fieldName="vehicle_model"
                isDisabled={!canEdit('vehicle_model')}
                disabledReason={getDisabledReason('vehicle_model')}
                placeholder="Non défini"
              />
            </InfoRow>
            {task.vehicle_year && (
              <InfoRow label="Année">
                <InlineEditableText
                  value={task.vehicle_year.toString()}
                  onSave={(value) => handleVehicleFieldEdit('vehicle_year', value)}
                  fieldName="vehicle_year"
                  isDisabled={!canEdit('vehicle_year')}
                  disabledReason={getDisabledReason('vehicle_year')}
                  placeholder="Non défini"
                />
              </InfoRow>
            )}
          </div>
          <div className="space-y-2">
            <InfoRow label="Plaque">
              <InlineEditableText
                value={task.vehicle_plate}
                onSave={(value) => handleVehicleFieldEdit('vehicle_plate', value)}
                fieldName="vehicle_plate"
                isDisabled={!canEdit('vehicle_plate')}
                disabledReason={getDisabledReason('vehicle_plate')}
                placeholder="Non définie"
                displayFormatter={(value) =>
                  value ? (
                    <span className="rounded bg-muted px-2 py-0.5 font-mono font-semibold">{value}</span>
                  ) : (
                    <span className="italic text-muted-foreground">Non définie</span>
                  )
                }
              />
            </InfoRow>
            {task.vin && (
              <InfoRow label="VIN">
                <InlineEditableText
                  value={task.vin}
                  onSave={(value) => handleVehicleFieldEdit('vin', value)}
                  fieldName="vin"
                  isDisabled={!canEdit('vin')}
                  disabledReason={getDisabledReason('vin')}
                  placeholder="Non défini"
                  displayFormatter={(value) =>
                    value ? (
                      <span className="font-mono text-xs">{value}</span>
                    ) : (
                      <span className="italic text-muted-foreground">Non défini</span>
                    )
                  }
                />
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Calendar} title="Planification" />
          <dl className="space-y-3">
            <InfoRow label="Date prévue">
              <InlineEditableDate
                value={task.scheduled_date}
                onSave={(value) => handleScheduleFieldEdit('scheduled_date', value)}
                fieldName="scheduled_date"
                isDisabled={!canEdit('scheduled_date')}
                disabledReason={getDisabledReason('scheduled_date')}
              />
            </InfoRow>
            <InfoRow label="Début">
              <InlineEditableTime
                value={task.start_time}
                onSave={(value) => handleScheduleFieldEdit('start_time', value)}
                fieldName="start_time"
                isDisabled={!canEdit('start_time')}
                disabledReason={getDisabledReason('start_time')}
              />
            </InfoRow>
            <InfoRow label="Fin">
              <InlineEditableTime
                value={task.end_time}
                onSave={(value) => handleScheduleFieldEdit('end_time', value)}
                fieldName="end_time"
                isDisabled={!canEdit('end_time')}
                disabledReason={getDisabledReason('end_time')}
              />
            </InfoRow>
            {task.estimated_duration_minutes && (
              <InfoRow label="Durée estimée">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {`${Math.floor(task.estimated_duration_minutes / 60)}h ${task.estimated_duration_minutes % 60 > 0 ? `${task.estimated_duration_minutes % 60} min` : ''}`}
                </span>
              </InfoRow>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Shield} title="Intervention" />
          <dl className="space-y-3">
            <InfoRow label="Statut">
              <InlineEditableSelect
                value={task.status}
                options={STATUS_OPTIONS}
                onSave={(value) => editField('status', value as UpdateTaskRequest['status'])}
                fieldName="status"
                isDisabled={!canEdit('status')}
                disabledReason={getDisabledReason('status')}
                displayFormatter={(value) => {
                  const option = STATUS_OPTIONS.find((entry) => entry.value === value);
                  return <Badge variant="outline">{option?.label || value}</Badge>;
                }}
              />
            </InfoRow>
            <InfoRow label="Priorité">
              <InlineEditableSelect
                value={task.priority}
                options={PRIORITY_OPTIONS}
                onSave={(value) => editField('priority', value as UpdateTaskRequest['priority'])}
                fieldName="priority"
                isDisabled={!canEdit('priority')}
                disabledReason={getDisabledReason('priority')}
                displayFormatter={(value) => (
                  <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium ${getPriorityColor(value || 'medium')}`}>
                    {getPriorityLabel(value || 'medium')}
                  </Badge>
                )}
              />
            </InfoRow>
            <InfoRow
              label="Checklist"
              value={task.checklist_items ? `${completedChecklistCount}/${task.checklist_items.length}` : '0/0'}
            />
          </dl>
        </div>
      </div>
    </>
  );
}

interface PpfAndClientSectionProps {
  task: TaskWithDetails;
  canEdit: (field: string) => boolean;
  getDisabledReason: (field: string) => string | undefined;
  handleLotFilmEdit: (value: string) => Promise<boolean>;
  handleCustomerFieldEdit: (field: 'customer_name' | 'customer_email' | 'customer_phone' | 'customer_address', value: string) => Promise<boolean>;
}

export function PpfAndClientSection({
  task,
  canEdit,
  getDisabledReason,
  handleLotFilmEdit,
  handleCustomerFieldEdit,
}: PpfAndClientSectionProps) {
  return (
    <>
      {(task.ppf_zones?.length || task.lot_film) && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Shield} title="Détails PPF" />
          <dl className="space-y-3">
            {!!task.ppf_zones?.length && (
              <>
                <InfoRow label="Zones PPF" value={`${task.ppf_zones.length} zone${task.ppf_zones.length > 1 ? 's' : ''}`} />
                <InfoRow label="Détail zones" value={task.ppf_zones.join(', ')} />
              </>
            )}
            <InfoRow label="Lot film">
              <InlineEditableText
                value={task.lot_film}
                onSave={handleLotFilmEdit}
                fieldName="lot_film"
                isDisabled={!canEdit('lot_film')}
                disabledReason={getDisabledReason('lot_film')}
                placeholder="Non défini"
                displayFormatter={(value) =>
                  value ? <span className="font-mono">{value}</span> : <span className="italic text-muted-foreground">Non défini</span>
                }
              />
            </InfoRow>
          </dl>
        </div>
      )}

      {(task.client || task.customer_name || task.customer_email || task.customer_phone || task.customer_address) && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={User} title="Client" />
          <div className="space-y-4">
            {task.client && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-3 w-3 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client entreprise</span>
                </div>
                <dl className="space-y-3">
                  <InfoRow label="Nom" value={task.client.name} />
                  {task.client.phone && <InfoRow label="Téléphone" value={task.client.phone} />}
                  {task.client.notes && (
                    <div className="mt-2 rounded bg-background/60 p-2 text-xs text-muted-foreground">
                      <span className="font-semibold">Notes:</span> {task.client.notes}
                    </div>
                  )}
                </dl>
              </div>
            )}

            {(task.customer_name || task.customer_email || task.customer_phone || task.customer_address) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client final</span>
                </div>
                <dl className="space-y-3">
                  <InfoRow label="Nom">
                    <InlineEditableText
                      value={task.customer_name}
                      onSave={(value) => handleCustomerFieldEdit('customer_name', value)}
                      fieldName="customer_name"
                      isDisabled={!canEdit('customer_name')}
                      disabledReason={getDisabledReason('customer_name')}
                      placeholder="Non défini"
                    />
                  </InfoRow>
                  {task.customer_phone && (
                    <InfoRow label="Téléphone">
                      <div className="flex items-center gap-2">
                        <InlineEditableText
                          value={task.customer_phone}
                          onSave={(value) => handleCustomerFieldEdit('customer_phone', value)}
                          fieldName="customer_phone"
                          type="tel"
                          isDisabled={!canEdit('customer_phone')}
                          disabledReason={getDisabledReason('customer_phone')}
                          placeholder="Non défini"
                        />
                        <button type="button" onClick={() => (window.location.href = `tel:${task.customer_phone}`)} className="rounded p-1 transition-colors hover:bg-accent/10" title="Appeler">
                          <Phone className="h-3.5 w-3.5 text-blue-600" />
                        </button>
                      </div>
                    </InfoRow>
                  )}
                  {task.customer_email && (
                    <InfoRow label="Email">
                      <div className="flex items-center gap-2">
                        <InlineEditableText
                          value={task.customer_email}
                          onSave={(value) => handleCustomerFieldEdit('customer_email', value)}
                          fieldName="customer_email"
                          type="email"
                          isDisabled={!canEdit('customer_email')}
                          disabledReason={getDisabledReason('customer_email')}
                          placeholder="Non défini"
                          className="max-w-[200px]"
                        />
                        <button type="button" onClick={() => (window.location.href = `mailto:${task.customer_email}`)} className="rounded p-1 transition-colors hover:bg-accent/10" title="Envoyer un email">
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                        </button>
                      </div>
                    </InfoRow>
                  )}
                  {task.customer_address && (
                    <InfoRow label="Adresse">
                      <div className="flex items-center gap-2">
                        <InlineEditableText
                          value={task.customer_address}
                          onSave={(value) => handleCustomerFieldEdit('customer_address', value)}
                          fieldName="customer_address"
                          isDisabled={!canEdit('customer_address')}
                          disabledReason={getDisabledReason('customer_address')}
                          placeholder="Non définie"
                          className="max-w-[200px]"
                        />
                        <button type="button" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(task.customer_address || '')}`, '_blank')} className="shrink-0 rounded p-1 transition-colors hover:bg-accent/10" title="Voir sur la carte">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        </button>
                      </div>
                    </InfoRow>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface AssignmentAndNotesSectionProps {
  task: TaskWithDetails;
  canEdit: (field: string) => boolean;
  getDisabledReason: (field: string) => string | undefined;
  handleNotesEdit: (value: string) => Promise<boolean>;
  expandedSections: Set<string>;
  onToggleSection: (section: string) => void;
}

export function AssignmentAndNotesSection({
  task,
  canEdit,
  getDisabledReason,
  handleNotesEdit,
  expandedSections,
  onToggleSection,
}: AssignmentAndNotesSectionProps) {
  return (
    <>
      {(task.technician || task.technician_id) && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={User} title="Assignation" />
          <dl className="space-y-3">
            <InfoRow label="Technicien" value={task.technician ? getUserFullName(task.technician) : 'Non assigné'} />
            {task.technician?.email && <InfoRow label="Email" value={task.technician.email} />}
          </dl>
        </div>
      )}

      <div id="task-notes" className="scroll-mt-28 rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
        <SectionHeader icon={AlertTriangle} title="Notes opérationnelles" />
        <div className="space-y-3">
          {(task.note || task.notes) && (
            <div className="rounded-lg border border-border/40 bg-background/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes d&apos;intervention</span>
              </div>
              <InlineEditableTextarea
                value={task.note || task.notes || ''}
                onSave={handleNotesEdit}
                fieldName="notes"
                isDisabled={!canEdit('notes')}
                disabledReason={getDisabledReason('notes')}
                placeholder="Aucune note"
                rows={4}
              />
            </div>
          )}

          {task.description && (
            <div className="rounded-lg border border-border/40 bg-background/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</span>
              </div>
              <ExpandableText
                value={task.description}
                sectionKey="description"
                expanded={expandedSections.has('description')}
                onToggle={onToggleSection}
              />
            </div>
          )}

          {task.customer_comments && (
            <div className="rounded-lg border border-border/40 bg-background/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <User className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commentaires client</span>
              </div>
              <ExpandableText
                value={task.customer_comments}
                sectionKey="commentaires-client"
                expanded={expandedSections.has('commentaires-client')}
                onToggle={onToggleSection}
              />
            </div>
          )}

          {task.special_instructions && (
            <div className="rounded-lg border border-border/40 bg-background/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instructions spéciales</span>
              </div>
              <ExpandableText
                value={task.special_instructions}
                sectionKey="instructions-speciales"
                expanded={expandedSections.has('instructions-speciales')}
                onToggle={onToggleSection}
              />
            </div>
          )}

          {!task.client?.notes && !task.note && !task.notes && !task.description && !task.customer_comments && !task.special_instructions && (
            <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-4 text-center">
              <span className="text-sm text-muted-foreground">Aucune note opérationnelle disponible</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
