'use client';

import { useState, useCallback } from 'react';
import { Link2, Eye, Calendar, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

interface QuotePublicLinkCardProps {
  publicToken: string | null;
  sharedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  onRevoke: () => void;
  organizationId?: string;
}

export function QuotePublicLinkCard({
  publicToken,
  sharedAt,
  viewCount,
  lastViewedAt,
  onRevoke,
  organizationId = '',
}: QuotePublicLinkCardProps) {
  const [revoking, setRevoking] = useState(false);

  const publicUrl = publicToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/quote/${organizationId}/${publicToken}`
    : null;

  const handleCopyLink = useCallback(() => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié dans le presse-papier');
    }
  }, [publicUrl]);

  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    try {
      await onRevoke();
      toast.success('Lien public révoqué');
    } catch (error) {
      toast.error('Erreur lors de la révocation du lien');
    } finally {
      setRevoking(false);
    }
  }, [onRevoke]);

  if (!publicToken) {
    return null;
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Lien de partage public</h3>
      </div>

      {/* View Statistics */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Vues:</span>
          <span className="font-medium">{viewCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Dernière vue:</span>
          <span className="font-medium">
            {lastViewedAt ? formatDateTime(lastViewedAt) : 'Jamais'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Partagé le:</span>
          <span className="font-medium">
            {sharedAt ? formatDateTime(sharedAt) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Public URL */}
      {publicUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
            >
              Copier
            </Button>
          </div>
        </div>
      )}

      {/* Revoke Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleRevoke}
        disabled={revoking}
      >
        {revoking && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        Révoquer le lien
      </Button>
    </div>
  );
}
