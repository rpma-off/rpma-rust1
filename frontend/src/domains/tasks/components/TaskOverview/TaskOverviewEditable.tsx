'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Building,
  Calendar,
  Car,
  Clock,
  Edit3,
  FileText,
  MapPin,
  Shield,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { getUserFullName } from '@/lib/types';
import { taskPriorityLabels } from '@/lib/i18n/status-labels';
import { Badge } from '@/components/ui/badge';
import {
  InlineEditableText,
  InlineEditableTextarea,
  InlineEditableSelect,
  InlineEditableDate,
  InlineEditableTime,
} from '@/shared/ui/inline-edit';
import { TaskWithDetails } from '@/types/task.types';
import { useInlineEditTask } from '../../hooks/useInlineEditTask';

interface TaskOverviewEditableProps {
  task: TaskWithDetails;
  defaultExpandedSections?: string[];
}

function getPriorityColor(priority: string): string {
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

function getPriorityLabel(priority: string): string {
  return taskPriorityLabels[priority?.toLowerCase()] || 'Non définie';
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending', label: 'En attente' },
  { value: 'scheduled', label: 'Planifiée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'on_hold', label: 'En pause' },
  { value: 'cancelled', label: 'Annulée' },
];

const SectionHeader = ({ icon: Icon, title, onEdit }: { icon: React.ElementType; title: string; onEdit?: () => void }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        <Edit3 className="h-3 w-3" />
        Modifier
      </button>
    )}
  </div>
);

const InfoRow = ({ 
  label, 
  children, 
  value,
  className = '' 
}: { 
  label: string; 
  children?: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex items-start justify-between gap-4 text-sm ${className}`}>
    <dt className="text-muted-foreground shrink-0">{label}</dt>
    <dd className="text-foreground font-medium text-right flex-1">{children || value}</dd>
  </div>
);

const handlePhoneClick = (phone: string | null) => {
  if (!phone) return;
  window.location.href = `tel:${phone}`;
};

const handleEmailClick = (email: string | null) => {
  if (!email) return;
  window.location.href = `mailto:${email}`;
};

const handleAddressClick = (address: string | null) => {
  if (!address) return;
  window.open(
    `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    '_blank'
  );
};

function ExpandableText({
  value,
  sectionKey,
  expanded,
  onToggle
}: {
  value: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (section: string) => void;
}) {
  const isLongText = value.length > 150;

  return (
    <div>
      <p className={`text-sm text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
        {value}
      </p>
      {isLongText && (
        <button
          type="button"
          onClick={() => onToggle(sectionKey)}
          className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}

export function TaskOverviewEditable({ task, defaultExpandedSections = [] }: TaskOverviewEditableProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(defaultExpandedSections));

  const {
    canEdit,
    getDisabledReason,
    editField,
  } = useInlineEditTask({ taskId: task.id });

  const completedChecklistCount = useMemo(
    () => task.checklist_items?.filter(item => item.is_completed).length ?? 0,
    [task.checklist_items],
  );

  const toggleSection = (section: string) => {
    setExpandedSections(current => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleVehicleFieldEdit = useCallback(
    async (field: 'vehicle_plate' | 'vehicle_make' | 'vehicle_model' | 'vehicle_year' | 'vin', value: string) => {
      return editField(field, value || null);
    },
    [editField]
  );

  const handleCustomerFieldEdit = useCallback(
    async (field: 'customer_name' | 'customer_email' | 'customer_phone' | 'customer_address', value: string) => {
      return editField(field, value || null);
    },
    [editField]
  );

  const handleScheduleFieldEdit = useCallback(
    async (field: 'scheduled_date' | 'start_time' | 'end_time', value: string) => {
      return editField(field, value || null);
    },
    [editField]
  );

  const handleNotesEdit = useCallback(
    async (value: string) => {
      return editField('notes', value || null);
    },
    [editField]
  );

  const handleLotFilmEdit = useCallback(
    async (value: string) => {
      return editField('lot_film', value || null);
    },
    [editField]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-accent" />
        <h2 className="text-lg md:text-xl font-semibold text-foreground">Vue d&apos;ensemble de l&apos;intervention</h2>
      </div>

      {/* Vehicle Information */}
      <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
        <SectionHeader icon={Car} title="Véhicule" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <InfoRow label="Marque">
              <InlineEditableText
                value={task.vehicle_make}
                onSave={(v) => handleVehicleFieldEdit('vehicle_make', v)}
                fieldName="vehicle_make"
                isDisabled={!canEdit('vehicle_make')}
                disabledReason={getDisabledReason('vehicle_make')}
                placeholder="Non défini"
              />
            </InfoRow>
            <InfoRow label="Modèle">
              <InlineEditableText
                value={task.vehicle_model}
                onSave={(v) => handleVehicleFieldEdit('vehicle_model', v)}
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
                  onSave={(v) => handleVehicleFieldEdit('vehicle_year', v)}
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
                onSave={(v) => handleVehicleFieldEdit('vehicle_plate', v)}
                fieldName="vehicle_plate"
                isDisabled={!canEdit('vehicle_plate')}
                disabledReason={getDisabledReason('vehicle_plate')}
                placeholder="Non définie"
                displayFormatter={(v) => v ? (
                  <span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded">{v}</span>
                ) : (
                  <span className="text-muted-foreground italic">Non définie</span>
                )}
              />
            </InfoRow>
            {task.vin && (
              <InfoRow label="VIN">
                <InlineEditableText
                  value={task.vin}
                  onSave={(v) => handleVehicleFieldEdit('vin', v)}
                  fieldName="vin"
                  isDisabled={!canEdit('vin')}
                  disabledReason={getDisabledReason('vin')}
                  placeholder="Non défini"
                  displayFormatter={(v) => v ? (
                    <span className="font-mono text-xs">{v}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Non défini</span>
                  )}
                />
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      {/* Planning & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Calendar} title="Planification" />
          <dl className="space-y-3">
            <InfoRow label="Date prévue">
              <InlineEditableDate
                value={task.scheduled_date}
                onSave={(v) => handleScheduleFieldEdit('scheduled_date', v)}
                fieldName="scheduled_date"
                isDisabled={!canEdit('scheduled_date')}
                disabledReason={getDisabledReason('scheduled_date')}
              />
            </InfoRow>
            <InfoRow label="Début">
              <InlineEditableTime
                value={task.start_time}
                onSave={(v) => handleScheduleFieldEdit('start_time', v)}
                fieldName="start_time"
                isDisabled={!canEdit('start_time')}
                disabledReason={getDisabledReason('start_time')}
              />
            </InfoRow>
            <InfoRow label="Fin">
              <InlineEditableTime
                value={task.end_time}
                onSave={(v) => handleScheduleFieldEdit('end_time', v)}
                fieldName="end_time"
                isDisabled={!canEdit('end_time')}
                disabledReason={getDisabledReason('end_time')}
              />
            </InfoRow>
            {task.estimated_duration_minutes && (
              <InfoRow label="Durée estimée">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                onSave={(v) => editField('status', v as 'draft' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled')}
                fieldName="status"
                isDisabled={!canEdit('status')}
                disabledReason={getDisabledReason('status')}
                displayFormatter={(v) => {
                  const option = STATUS_OPTIONS.find(o => o.value === v);
                  return <Badge variant="outline">{option?.label || v}</Badge>;
                }}
              />
            </InfoRow>
            <InfoRow label="Priorité">
              <InlineEditableSelect
                value={task.priority}
                options={PRIORITY_OPTIONS}
                onSave={(v) => editField('priority', v as 'low' | 'medium' | 'high' | 'urgent')}
                fieldName="priority"
                isDisabled={!canEdit('priority')}
                disabledReason={getDisabledReason('priority')}
                displayFormatter={(v) => (
                  <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium ${getPriorityColor(v || 'medium')}`}>
                    {getPriorityLabel(v || 'medium')}
                  </Badge>
                )}
              />
            </InfoRow>
            <InfoRow label="Checklist" value={
              task.checklist_items
                ? `${completedChecklistCount}/${task.checklist_items.length}`
                : '0/0'
            } />
          </dl>
        </div>
      </div>

      {/* PPF Zones & Film Details */}
      {(task.ppf_zones?.length || task.lot_film) && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Shield} title="Détails PPF" />
          <dl className="space-y-3">
            {task.ppf_zones?.length && (
              <>
                <InfoRow
                  label="Zones PPF"
                  value={`${task.ppf_zones.length} zone${task.ppf_zones.length > 1 ? 's' : ''}`}
                />
                <InfoRow
                  label="Détail zones"
                  value={task.ppf_zones.join(', ')}
                />
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
                displayFormatter={(v) => v ? (
                  <span className="font-mono">{v}</span>
                ) : (
                  <span className="text-muted-foreground italic">Non défini</span>
                )}
              />
            </InfoRow>
          </dl>
        </div>
      )}

      {/* Client Information */}
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
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-background/60 rounded">
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
                      onSave={(v) => handleCustomerFieldEdit('customer_name', v)}
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
                          onSave={(v) => handleCustomerFieldEdit('customer_phone', v)}
                          fieldName="customer_phone"
                          type="tel"
                          isDisabled={!canEdit('customer_phone')}
                          disabledReason={getDisabledReason('customer_phone')}
                          placeholder="Non défini"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhoneClick(task.customer_phone)}
                          className="p-1 hover:bg-accent/10 rounded transition-colors"
                          title="Appeler"
                        >
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
                          onSave={(v) => handleCustomerFieldEdit('customer_email', v)}
                          fieldName="customer_email"
                          type="email"
                          isDisabled={!canEdit('customer_email')}
                          disabledReason={getDisabledReason('customer_email')}
                          placeholder="Non défini"
                          className="max-w-[200px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleEmailClick(task.customer_email)}
                          className="p-1 hover:bg-accent/10 rounded transition-colors"
                          title="Envoyer un email"
                        >
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
                          onSave={(v) => handleCustomerFieldEdit('customer_address', v)}
                          fieldName="customer_address"
                          isDisabled={!canEdit('customer_address')}
                          disabledReason={getDisabledReason('customer_address')}
                          placeholder="Non définie"
                          className="max-w-[200px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddressClick(task.customer_address)}
                          className="p-1 hover:bg-accent/10 rounded transition-colors shrink-0"
                          title="Voir sur la carte"
                        >
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

      {/* Assignment */}
      {(task.technician || task.technician_id) && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={User} title="Assignation" />
          <dl className="space-y-3">
            <InfoRow label="Technicien" value={task.technician ? getUserFullName(task.technician) : 'Non assigné'} />
            {task.technician?.email && (
              <InfoRow label="Email" value={task.technician.email} />
            )}
          </dl>
        </div>
      )}

      {/* Operational Notes */}
      <div id="task-notes" className="scroll-mt-28 rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
        <SectionHeader icon={AlertTriangle} title="Notes opérationnelles" />
        <div className="space-y-3">
          {(task.note || task.notes) && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes d&apos;intervention</span>
                </div>
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
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</span>
              </div>
              <ExpandableText
                value={task.description}
                sectionKey="description"
                expanded={expandedSections.has('description')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {task.customer_comments && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commentaires client</span>
              </div>
              <ExpandableText
                value={task.customer_comments}
                sectionKey="commentaires-client"
                expanded={expandedSections.has('commentaires-client')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {task.special_instructions && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instructions spéciales</span>
              </div>
              <ExpandableText
                value={task.special_instructions}
                sectionKey="instructions-speciales"
                expanded={expandedSections.has('instructions-speciales')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {!task.client?.notes && !task.note && !task.notes && !task.description &&
            !task.customer_comments &&
            !task.special_instructions && (
              <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-4 text-center">
                <span className="text-sm text-muted-foreground">Aucune note opérationnelle disponible</span>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
