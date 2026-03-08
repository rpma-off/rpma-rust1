'use client';

import Link from 'next/link';
import { Calendar, ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuoteDetailsCardProps {
  validUntil: string;
  onValidUntilChange: (date: string) => void;
  inspectionId?: string | null;
}

export function QuoteDetailsCard({
  validUntil,
  onValidUntilChange,
  inspectionId,
}: QuoteDetailsCardProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="validUntil" className="text-sm font-medium flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Valide jusqu&apos;au
        </Label>
        <Input
          id="validUntil"
          type="date"
          value={validUntil}
          onChange={(e) => onValidUntilChange(e.target.value)}
          className="h-9"
        />
      </div>

      {inspectionId && (
        <Link
          href={`/inspections/${inspectionId}`}
          className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground border border-border"
        >
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          <span>Voir l&apos;inspection</span>
        </Link>
      )}
    </div>
  );
}
