'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Copy, Link2, Loader2, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNumber: string;
  organizationId?: string;
  initialToken: string | null;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  onGenerateLink?: () => Promise<void>;
  onRevokeLink?: () => Promise<void>;
  onSendEmail?: () => Promise<void>;
  onSendSms?: () => Promise<void>;
}

export function QuoteShareDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  organizationId = '',
  initialToken,
  customer,
  smsEnabled = false,
  emailEnabled = false,
  onGenerateLink,
  onRevokeLink,
  onSendEmail,
  onSendSms,
}: QuoteShareDialogProps) {
  const [publicToken, setPublicToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [sending, setSending] = useState(false);

  const hasEmail = !!customer?.email;
  const hasPhone = !!customer?.phone;

  const publicUrl = publicToken && organizationId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/quote/${organizationId}/${publicToken}`
    : null;

  const handleGenerate = async () => {
    if (!onGenerateLink) return;
    await onGenerateLink();
    // The parent should update initialToken which will re-render this component
  };

  const handleRevoke = async () => {
    if (!onRevokeLink) return;
    await onRevokeLink();
    setPublicToken(null);
  };

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Lien copié dans le presse-papier');
    }
  };

  const handleNotify = async () => {
    if (!publicUrl || !customer) return;
    setSending(true);

    const results: string[] = [];

    if (notifyEmail && hasEmail && onSendEmail) {
      try {
        await onSendEmail();
        results.push('Email envoyé');
      } catch (error) {
        toast.error('Erreur lors de l\'envoi de l\'email');
      }
    }

    if (notifySms && hasPhone && onSendSms) {
      try {
        await onSendSms();
        results.push('SMS envoyé');
      } catch (error) {
        toast.error('Erreur lors de l\'envoi du SMS');
      }
    }

    if (results.length > 0) {
      toast.success(results.join(' & '));
      setNotifyEmail(false);
      setNotifySms(false);
    }
    setSending(false);
  };

  const canNotify = publicUrl && customer && (notifyEmail || notifySms);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Partager le devis
          </DialogTitle>
          <DialogDescription>
            Partagez le devis <strong>{quoteNumber}</strong> avec votre client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!publicUrl ? (
            <Button onClick={handleGenerate} className="w-full">
              Générer un lien de partage public
            </Button>
          ) : (
            <>
              {/* Public Link */}
              <div className="space-y-2">
                <Label htmlFor="shareLink">Lien de partage</Label>
                <div className="flex gap-2">
                  <Input
                    id="shareLink"
                    value={publicUrl}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Notify Customer */}
              {customer && (emailEnabled || smsEnabled) && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Notifier {customer.name}</p>
                  <div className="space-y-2">
                    {emailEnabled && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="notify-email-quote"
                          checked={notifyEmail}
                          onCheckedChange={(v) => setNotifyEmail(v === true)}
                          disabled={!hasEmail}
                        />
                        <Label
                          htmlFor="notify-email-quote"
                          className={`flex items-center gap-1.5 text-sm ${!hasEmail ? 'text-muted-foreground/50' : ''}`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                          {!hasEmail && <span className="text-xs">(Pas d'email)</span>}
                        </Label>
                      </div>
                    )}
                    {smsEnabled && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="notify-sms-quote"
                          checked={notifySms}
                          onCheckedChange={(v) => setNotifySms(v === true)}
                          disabled={!hasPhone}
                        />
                        <Label
                          htmlFor="notify-sms-quote"
                          className={`flex items-center gap-1.5 text-sm ${!hasPhone ? 'text-muted-foreground/50' : ''}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          SMS
                          {!hasPhone && <span className="text-xs">(Pas de téléphone)</span>}
                        </Label>
                      </div>
                    )}
                  </div>
                  {canNotify && (
                    <Button size="sm" onClick={handleNotify} disabled={sending} className="w-full">
                      {sending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Envoyer la notification
                    </Button>
                  )}
                </div>
              )}

              {/* Revoke Link */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleRevoke}
              >
                Révoquer le lien public
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
