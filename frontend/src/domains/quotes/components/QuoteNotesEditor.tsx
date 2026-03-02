'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type NoteType = 'public' | 'internal';

interface QuoteNotesEditorProps {
  publicNote: string;
  internalNote: string;
  onPublicNoteChange: (note: string) => void;
  onInternalNoteChange: (note: string) => void;
}

export function QuoteNotesEditor({
  publicNote,
  internalNote,
  onPublicNoteChange,
  onInternalNoteChange,
}: QuoteNotesEditorProps) {
  const [noteType, setNoteType] = useState<NoteType>('public');

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5" />
          Notes
        </h3>
        <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public (client)</SelectItem>
            <SelectItem value="internal">Interne</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {noteType === 'public' && (
        <div className="space-y-1">
          <Textarea
            placeholder="Ajoutez une note visible par le client..."
            value={publicNote}
            onChange={(e) => onPublicNoteChange(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Cette note sera visible par le client sur le devis.
          </p>
        </div>
      )}

      {noteType === 'internal' && (
        <div className="space-y-1">
          <Textarea
            placeholder="Ajoutez une note interne pour l'équipe..."
            value={internalNote}
            onChange={(e) => onInternalNoteChange(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Cette note est uniquement visible par l'équipe interne.
          </p>
        </div>
      )}
    </div>
  );
}
