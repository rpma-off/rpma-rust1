'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Building,
  Calendar,
  Car,
  FileText,
  MapPin,
  Shield,
  User
} from 'lucide-react';
import { getUserFullName } from '@/lib/types';
import { TaskWithDetails } from '@/types/task.types';
import { Task } from '@/lib/backend';

interface TaskOverviewProps {
  task: TaskWithDetails;
  defaultExpandedSections?: string[];
}

function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return 'Non défini';
  try {
    return new Date(timeString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Heure invalide';
  }
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
}

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-accent" />
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
  </div>
);

const InfoRow = ({ label, value, action }: { label: string; value: React.ReactNode; action?: () => void }) => (
  <div
    className={`flex items-start justify-between gap-4 text-sm ${action ? 'cursor-pointer hover:bg-accent/5 -mx-1 px-1 rounded transition-colors' : ''}`}
    onClick={action}
  >
    <dt className="text-border-light">{label}</dt>
    <dd className="text-foreground font-medium text-right">{value}</dd>
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-4 text-center">
    <span className="text-sm text-border-light">{label}</span>
  </div>
);

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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
      <p className={`text-sm text-border-light leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
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

export function TaskOverview({ task, defaultExpandedSections = [] }: TaskOverviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(defaultExpandedSections));

  const toggleSection = (section: string) => {
    setExpandedSections(current => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

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
            <InfoRow
              label="Modèle"
              value={
                <span className="font-semibold">
                  {task.vehicle_make} {task.vehicle_model}
                </span>
              }
            />
            {task.vehicle_year && (
              <InfoRow label="Année" value={task.vehicle_year.toString()} />
            )}
          </div>
          <div className="space-y-2">
            {task.vehicle_plate && (
              <InfoRow
                label="Plaque"
                value={
                  <span className="font-mono font-semibold bg-muted px-2 py-0.5 rounded">
                    {task.vehicle_plate}
                  </span>
                }
              />
            )}
            {task.vin && (
              <InfoRow
                label="VIN"
                value={
                  <span className="font-mono text-xs">
                    {task.vin}
                  </span>
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Planning & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Calendar} title="Planification" />
          <dl className="space-y-3">
            {task.scheduled_date && (
              <InfoRow
                label="Date prévue"
                value={formatDate(task.scheduled_date)}
              />
            )}
            {task.start_time && (
              <InfoRow
                label="Début"
                value={formatTime(task.start_time)}
              />
            )}
            {task.end_time && (
              <InfoRow
                label="Fin"
                value={formatTime(task.end_time)}
              />
            )}
            {task.estimated_duration_minutes && (
              <InfoRow
                label="Durée estimée"
                value={`${Math.floor(task.estimated_duration_minutes / 60)}h ${task.estimated_duration_minutes % 60 > 0 ? `${task.estimated_duration_minutes % 60} min` : ''}`}
              />
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Shield} title="Intervention" />
          <dl className="space-y-3">
            <InfoRow
              label="Priorité"
              value={
                <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium ${getPriorityColor(task.priority || 'medium')}`}>
                  {getPriorityLabel(task.priority || 'medium')}
                </Badge>
              }
            />
            <InfoRow
              label="Checklist"
              value={
                task.checklist_items
                  ? `${task.checklist_items.filter(item => item.is_completed).length}/${task.checklist_items.length}`
                  : '0/0'
              }
            />
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
            {task.lot_film && <InfoRow label="Lot film" value={<span className="font-mono">{task.lot_film}</span>} />}
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Client entreprise</span>
                </div>
                <dl className="space-y-3">
                  <InfoRow label="Nom" value={task.client.name} />
                  {task.client.phone && <InfoRow label="Téléphone" value={task.client.phone} />}
                  {task.client.notes && (
                    <div className="text-xs text-border-light mt-2 p-2 bg-background/60 rounded">
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Client final</span>
                </div>
                <dl className="space-y-3">
                  {task.customer_name && <InfoRow label="Nom" value={task.customer_name} />}
                  {task.customer_phone && (
                    <InfoRow
                      label="Téléphone"
                      value={
                        <button
                          type="button"
                          onClick={() => handlePhoneClick(task.customer_phone)}
                          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {task.customer_phone}
                        </button>
                      }
                      action={() => handlePhoneClick(task.customer_phone)}
                    />
                  )}
                  {task.customer_email && (
                    <InfoRow
                      label="Email"
                      value={
                        <button
                          type="button"
                          onClick={() => handleEmailClick(task.customer_email)}
                          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors text-xs truncate max-w-[200px]"
                        >
                          {task.customer_email}
                        </button>
                      }
                      action={() => handleEmailClick(task.customer_email)}
                    />
                  )}
                  {task.customer_address && (
                    <InfoRow
                      label="Adresse"
                      value={
                        <button
                          type="button"
                          onClick={() => handleAddressClick(task.customer_address)}
                          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors text-xs truncate max-w-[200px] inline-flex items-center gap-1"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {task.customer_address}
                        </button>
                      }
                      action={() => handleAddressClick(task.customer_address)}
                    />
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
              <InfoRow
                label="Email"
                value={
                  <button
                    type="button"
                    onClick={() => handleEmailClick(task.technician?.email ?? null)}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {task.technician.email}
                  </button>
                }
                action={() => handleEmailClick(task.technician?.email ?? null)}
              />
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
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Notes d&apos;intervention</span>
              </div>
              <ExpandableText
                value={task.note || task.notes || ''}
                sectionKey="notes-intervention"
                expanded={expandedSections.has('notes-intervention')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {task.description && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Description</span>
              </div>
              <ExpandableText
                value={task.description}
                sectionKey="description"
                expanded={expandedSections.has('description')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {(task as Task & { customer_comments?: string }).customer_comments && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Commentaires client</span>
              </div>
              <ExpandableText
                value={(task as Task & { customer_comments?: string }).customer_comments || ''}
                sectionKey="commentaires-client"
                expanded={expandedSections.has('commentaires-client')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {(task as Task & { special_instructions?: string }).special_instructions && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Instructions spéciales</span>
              </div>
              <ExpandableText
                value={(task as Task & { special_instructions?: string }).special_instructions || ''}
                sectionKey="instructions-speciales"
                expanded={expandedSections.has('instructions-speciales')}
                onToggle={toggleSection}
              />
            </div>
          )}

          {!task.client?.notes && !task.note && !task.notes && !task.description &&
            !(task as Task & { customer_comments?: string }).customer_comments &&
            !(task as Task & { special_instructions?: string }).special_instructions && (
              <EmptyState label="Aucune note opérationnelle disponible" />
            )}
        </div>
      </div>
    </div>
  );
}

