'use client';

import { useState } from 'react';
import { FileText, MessageSquare, Lock } from 'lucide-react';
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
    <div className="space-y-4 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Notes
        </h3>
        <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                Public (client)
              </div>
            </SelectItem>
            <SelectItem value="internal">
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Interne
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {noteType === 'public' && (
          <>
            <Textarea
              placeholder="Ajoutez une note visible par le client..."
              value={publicNote}
              onChange={(e) => onPublicNoteChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Cette note sera visible par le client sur le devis.
            </p>
          </>
        )}

        {noteType === 'internal' && (
          <>
            <Textarea
              placeholder="Ajoutez une note interne pour l'équipe..."
              value={internalNote}
              onChange={(e) => onInternalNoteChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Cette note est uniquement visible par l&apos;équipe interne.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
