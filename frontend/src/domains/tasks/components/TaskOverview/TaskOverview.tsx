'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Building,
  FileText,
  MapPin,
  Shield,
  User,
  Wrench
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

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <dt className="text-border-light">{label}</dt>
    <dd className="text-foreground font-medium text-right">{value}</dd>
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-4 text-center">
    <span className="text-sm text-border-light">{label}</span>
  </div>
);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
          <SectionHeader icon={Wrench} title="Exécution terrain" />
          <dl className="space-y-3">
            <InfoRow
              label="Zones PPF"
              value={task.ppf_zones?.length ? `${task.ppf_zones.length} zone${task.ppf_zones.length > 1 ? 's' : ''}` : 'Non précisées'}
            />
            {task.ppf_zones?.length ? <InfoRow label="Détail zones" value={task.ppf_zones.join(', ')} /> : null}
            {task.lot_film && <InfoRow label="Lot film" value={<span className="font-mono">{task.lot_film}</span>} />}
            {task.heure_rdv && <InfoRow label="Heure RDV" value={task.heure_rdv} />}
            {task.estimated_duration_minutes && (
              <InfoRow
                label="Durée estimée"
                value={`${Math.floor(task.estimated_duration_minutes / 60)}h ${task.estimated_duration_minutes % 60 > 0 ? `${task.estimated_duration_minutes % 60} min` : ''}`}
              />
            )}
            {task.start_time && <InfoRow label="Début effectif" value={formatTime(task.start_time)} />}
            {task.end_time && <InfoRow label="Fin effective" value={formatTime(task.end_time)} />}
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
        <SectionHeader icon={User} title="Client et accès" />
        {(task.client || task.customer_name || task.customer_email || task.customer_phone || task.customer_address) ? (
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
                  {task.customer_phone && <InfoRow label="Téléphone" value={task.customer_phone} />}
                  {task.customer_email && <InfoRow label="Email" value={task.customer_email} />}
                  {task.customer_address && (
                    <InfoRow
                      label="Adresse"
                      value={
                        <span className="inline-flex items-center gap-1 text-right">
                          <MapPin className="h-3.5 w-3.5 text-border-light" />
                          {task.customer_address}
                        </span>
                      }
                    />
                  )}
                </dl>
              </div>
            )}

            <div className="pt-1 border-t border-border/40">
              <dl className="space-y-3 pt-3">
                <InfoRow label="Technicien" value={task.technician ? getUserFullName(task.technician) : 'Non assigné'} />
                {task.technician?.email && <InfoRow label="Email technicien" value={task.technician.email} />}
                {task.vin && <InfoRow label="VIN" value={<span className="font-mono">{task.vin}</span>} />}
              </dl>
            </div>
          </div>
        ) : (
          <EmptyState label="Aucune information client disponible" />
        )}
      </div>

      <div id="task-notes" className="scroll-mt-28 rounded-lg border border-border/50 bg-background/40 p-4 space-y-3">
        <SectionHeader icon={AlertTriangle} title="Notes opérationnelles" />
        <div className="space-y-3">
          {task.client?.notes && (
            <div className="bg-background/60 rounded-lg border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-3 w-3 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-border-light">Notes client entreprise</span>
              </div>
              <ExpandableText
                value={task.client.notes}
                sectionKey="notes-client"
                expanded={expandedSections.has('notes-client')}
                onToggle={toggleSection}
              />
            </div>
          )}

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

