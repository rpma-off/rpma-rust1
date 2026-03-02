'use client';

import Link from 'next/link';
import { ClipboardCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QuoteStatus } from '@/types/quote.types';
import { STATUS_LABELS } from './QuoteStatusBadge';

interface QuoteDetailsCardProps {
  title: string;
  status: QuoteStatus;
  validUntil: string;
  onTitleChange: (title: string) => void;
  onStatusChange: (status: QuoteStatus) => void;
  onValidUntilChange: (date: string) => void;
  inspectionId?: string | null;
}

export function QuoteDetailsCard({
  title,
  status,
  validUntil,
  onTitleChange,
  onStatusChange,
  onValidUntilChange,
  inspectionId,
}: QuoteDetailsCardProps) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <h3 className="text-sm font-semibold">Détails du devis</h3>

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title" className="text-xs">Titre</Label>
        <Input
          id="title"
          placeholder="Titre du devis"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {/* Status & Date */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v as QuoteStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{STATUS_LABELS.draft}</SelectItem>
              <SelectItem value="sent">{STATUS_LABELS.sent}</SelectItem>
              <SelectItem value="accepted">{STATUS_LABELS.accepted}</SelectItem>
              <SelectItem value="rejected">{STATUS_LABELS.rejected}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="validUntil" className="text-xs">
            Valide jusqu'au
          </Label>
          <Input
            id="validUntil"
            type="date"
            value={validUntil}
            onChange={(e) => onValidUntilChange(e.target.value)}
          />
        </div>
      </div>

      {/* Inspection Link */}
      {inspectionId && (
        <Link
          href={`/inspections/${inspectionId}`}
          className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Voir l'inspection</span>
        </Link>
      )}
    </div>
  );
}
