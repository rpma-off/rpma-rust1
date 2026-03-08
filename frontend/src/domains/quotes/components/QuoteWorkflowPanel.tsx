'use client';

import Link from 'next/link';
import {
  Send,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  FileDown,
  RotateCcw,
  Clock,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Quote } from '@/types/quote.types';

export interface QuoteWorkflowPanelProps {
  quote: Quote;
  statusLoading: boolean;
  exportLoading: boolean;
  duplicateLoading: boolean;
  onMarkSent: () => void;
  onMarkAccepted: () => void;
  onMarkRejected: () => void;
  onMarkExpired: () => void;
  onMarkChangesRequested: () => void;
  onReopen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportPdf: () => void;
  onConvertToTask?: () => void;
}

export function QuoteWorkflowPanel({
  quote,
  statusLoading,
  exportLoading,
  duplicateLoading,
  onMarkSent,
  onMarkAccepted,
  onMarkRejected,
  onMarkExpired,
  onMarkChangesRequested,
  onReopen,
  onDuplicate,
  onDelete,
  onExportPdf,
  onConvertToTask,
}: QuoteWorkflowPanelProps) {
  const status = quote.status;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {status === 'draft' && (
          <>
            <Button
              onClick={onMarkSent}
              disabled={statusLoading}
              className="w-full justify-start"
              size="sm"
            >
              <Send className="mr-2 h-4 w-4" />
              Envoyer au client
            </Button>
            <Button
              onClick={onDuplicate}
              disabled={duplicateLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le devis {quote.quote_number} sera définitivement supprimé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {status === 'sent' && (
          <>
            <Button
              onClick={onMarkAccepted}
              disabled={statusLoading}
              className="w-full justify-start bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Marquer Accepté
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={statusLoading}
                  className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  size="sm"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Marquer Rejeté
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rejeter ce devis ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le devis {quote.quote_number} sera marqué comme rejeté.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onMarkRejected} className="bg-red-600 hover:bg-red-700">
                    Confirmer le rejet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={onMarkChangesRequested}
              disabled={statusLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Demander révision
            </Button>
            <Button
              onClick={onExportPdf}
              disabled={exportLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
            <Button
              onClick={onDuplicate}
              disabled={duplicateLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer
            </Button>
          </>
        )}

        {(status === 'accepted' || status === 'converted') && (
          <>
            {status === 'accepted' && !quote.task_id && onConvertToTask && (
              <Button
                onClick={onConvertToTask}
                disabled={statusLoading}
                className="w-full justify-start"
                size="sm"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Convertir en tâche
              </Button>
            )}
            {quote.task_id && (
              <Link href={`/tasks/${quote.task_id}`}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Voir la Task
                </Button>
              </Link>
            )}
            <Button
              onClick={onExportPdf}
              disabled={exportLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
            <Button
              onClick={onDuplicate}
              disabled={duplicateLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer
            </Button>
          </>
        )}

        {status === 'rejected' && (
          <>
            <Button
              onClick={onDuplicate}
              disabled={duplicateLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer en brouillon
            </Button>
            <Button
              onClick={onExportPdf}
              disabled={exportLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
          </>
        )}

        {status === 'changes_requested' && (
          <>
            <Button
              onClick={onReopen}
              disabled={statusLoading}
              className="w-full justify-start"
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réouvrir en brouillon
            </Button>
            <Button
              onClick={onDuplicate}
              disabled={duplicateLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer
            </Button>
          </>
        )}

        {status === 'expired' && (
          <>
            <Button
              onClick={onDuplicate}
              disabled={duplicateLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer en brouillon
            </Button>
            <Button
              onClick={onExportPdf}
              disabled={exportLoading}
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
          </>
        )}

        {(status === 'draft' || status === 'sent') && (
          <Button
            onClick={onMarkExpired}
            disabled={statusLoading}
            variant="ghost"
            className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            size="sm"
          >
            <Clock className="mr-2 h-4 w-4" />
            Marquer expiré
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
