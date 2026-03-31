'use client';

import React from 'react';
import { Edit3, type LucideIcon } from 'lucide-react';
import { taskPriorityLabels } from '@/lib/i18n/status-labels';
import { Badge } from '@/components/ui/badge';

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

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  onEdit?: () => void;
}

export function SectionHeader({ icon: Icon, title, onEdit }: SectionHeaderProps) {
  return (
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
}

interface InfoRowProps {
  label: string;
  children?: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}

export function InfoRow({ label, children, value, className = '' }: InfoRowProps) {
  return (
    <div className={`flex items-start justify-between gap-4 text-sm ${className}`}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1 text-right font-medium text-foreground">{children || value}</dd>
    </div>
  );
}

interface ExpandableTextProps {
  value: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (section: string) => void;
}

export function ExpandableText({
  value,
  sectionKey,
  expanded,
  onToggle,
}: ExpandableTextProps) {
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

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 text-xs font-medium ${getPriorityColor(priority || 'medium')}`}
    >
      {getPriorityLabel(priority || 'medium')}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const option = STATUS_OPTIONS.find((entry) => entry.value === status);
  return <Badge variant="outline">{option?.label || status}</Badge>;
}
