import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { CreateQuoteItemRequest, QuoteItemKind } from '@/shared/types';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/domains/auth';
import { quotesIpc } from '@/domains/quotes/ipc/quotes.ipc';
import {
  useDeleteQuote,
  useDuplicateQuote,
  useQuote,
  useQuoteAttachments,
  useQuoteExportPdf,
  useQuoteItems,
  useQuoteStatus,
} from './useQuotes';
import type { ConvertQuoteToTaskResponse } from '@/types/quote.types';

export type ActiveTab = 'details' | 'items' | 'images' | 'documents' | 'history';

export function useQuoteDetailPage(quoteId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast: uiToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [acceptedTaskId, setAcceptedTaskId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<QuoteItemKind>('service');
  const [newQty, setNewQty] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [newTaxRate] = useState(20);
  const [newDescription, setNewDescription] = useState('');

  const { quote, loading, error, refetch } = useQuote(quoteId);
  const { deleteQuote } = useDeleteQuote();
  const { duplicateQuote, loading: duplicateLoading } = useDuplicateQuote();
  const { addItem, deleteItem } = useQuoteItems();
  const { markSent, markAccepted, markRejected, markExpired, markChangesRequested, reopen, loading: statusLoading } = useQuoteStatus();
  const { exportPdf, loading: exportLoading } = useQuoteExportPdf();
  const { attachments, loading: attachmentsLoading } = useQuoteAttachments(quoteId);

  const handleAddItem = async () => {
    if (!newLabel.trim() || !quoteId) {
      return;
    }

    const item: CreateQuoteItemRequest = {
      kind: newKind,
      label: newLabel,
      description: newDescription || null,
      qty: newQty,
      unit_price: Math.round(newUnitPrice * 100),
      tax_rate: newTaxRate,
      position: quote?.items?.length || 0,
    };

    const result = await addItem(quoteId, item);
    if (!result) {
      return;
    }

    setShowAddItem(false);
    setNewLabel('');
    setNewDescription('');
    setNewQty(1);
    setNewUnitPrice(0);
    await refetch();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!quoteId) {
      return;
    }

    await deleteItem(quoteId, itemId);
    await refetch();
  };

  const handleMarkSent = async () => {
    if (!quoteId) return;
    const result = await markSent(quoteId);
    if (result) {
      toast.success('Devis envoyé au client');
    } else {
      toast.error('Erreur lors de l\'envoi du devis');
    }
    await refetch();
  };

  const handleMarkAccepted = async () => {
    if (!quoteId) return;
    const result = await markAccepted(quoteId);
    if (result?.task_created?.task_id) {
      setAcceptedTaskId(result.task_created.task_id);
      toast.success('Devis accepté — Task créée avec succès');
    } else if (result) {
      toast.success('Devis accepté');
    } else {
      toast.error('Erreur lors de l\'acceptation du devis');
    }
    await refetch();
  };

  const handleMarkRejected = async () => {
    if (!quoteId) return;
    const result = await markRejected(quoteId);
    if (result) {
      toast.success('Devis marqué comme rejeté');
    } else {
      toast.error('Erreur lors du rejet du devis');
    }
    await refetch();
  };

  const handleMarkExpired = async () => {
    if (!quoteId) return;
    const result = await markExpired(quoteId);
    if (result) {
      toast.success('Devis marqué comme expiré');
    } else {
      toast.error('Erreur lors du marquage comme expiré');
    }
    await refetch();
  };

  const handleMarkChangesRequested = async () => {
    if (!quoteId) return;
    const result = await markChangesRequested(quoteId);
    if (result) {
      toast.success('Révision demandée');
    } else {
      toast.error('Erreur lors de la demande de révision');
    }
    await refetch();
  };

  const handleReopen = async () => {
    if (!quoteId) return;
    const result = await reopen(quoteId);
    if (result) {
      toast.success('Devis réouvert en brouillon');
    } else {
      toast.error('Erreur lors de la réouverture du devis');
    }
    await refetch();
  };

  const handleDelete = async () => {
    if (!quoteId) {
      return;
    }

    const deleted = await deleteQuote(quoteId);
    if (deleted) {
      toast.success('Devis supprimé');
      router.push('/quotes');
    } else {
      toast.error('Erreur lors de la suppression du devis');
    }

    setShowDeleteDialog(false);
  };

  const handleExportPdf = async () => {
    if (!quoteId) {
      return;
    }

    const result = await exportPdf(quoteId);
    if (result?.file_path) {
      toast.success('PDF exporté avec succès');
    } else {
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  };

  const handleDuplicate = async () => {
    if (!quoteId) return;
    const result = await duplicateQuote(quoteId);
    if (result) {
      toast.success('Devis dupliqué');
      router.push(`/quotes/${result.id}`);
    } else {
      toast.error('Erreur lors de la duplication du devis');
    }
  };

  const handleConvertToTask = async () => {
    if (!quoteId || !quote) {
      return;
    }

    if (!user?.token) {
      uiToast({
        title: 'Not authenticated',
        variant: 'destructive',
      });
      return;
    }

    const plate = quote.vehicle_plate?.trim() ?? '';
    const model = quote.vehicle_model?.trim() ?? '';

    if (!plate || !model) {
      uiToast({
        title: 'Vehicle plate and model are required to convert this quote.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setConvertLoading(true);
      const result = await quotesIpc.convertToTask(
        quoteId,
        {
          plate,
          model,
          make: quote.vehicle_make ?? '',
          year: quote.vehicle_year ?? '',
          vin: quote.vehicle_vin ?? '',
        }
      );
      const response = result as ConvertQuoteToTaskResponse | null;

      if (response?.task_id) {
        uiToast({ title: 'Task created successfully' });
        router.push(`/tasks/${response.task_id}`);
        return;
      }

      uiToast({
        title: 'Conversion failed',
        variant: 'destructive',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Conversion failed';
      uiToast({
        title: message,
        variant: 'destructive',
      });
    } finally {
      setConvertLoading(false);
    }
  };

  const isDraft = quote?.status === 'draft';
  const isSent = quote?.status === 'sent';
  const isAccepted = quote?.status === 'accepted';
  const isConverted = quote?.status === 'converted';
  const isRejected = quote?.status === 'rejected';
  const isExpired = quote?.status === 'expired';
  const isChangesRequested = quote?.status === 'changes_requested';
  const canEdit = isDraft || isChangesRequested;

  return {
    quote,
    loading,
    error,
    attachments,
    attachmentsLoading,
    statusLoading,
    exportLoading,
    duplicateLoading,
    activeTab,
    setActiveTab,
    showConvertDialog,
    setShowConvertDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    showAddItem,
    setShowAddItem,
    acceptedTaskId,
    newLabel,
    setNewLabel,
    newKind,
    setNewKind,
    newQty,
    setNewQty,
    newUnitPrice,
    setNewUnitPrice,
    newDescription,
    setNewDescription,
    isDraft,
    isSent,
    isAccepted,
    isConverted,
    isRejected,
    isExpired,
    isChangesRequested,
    canEdit,
    convertLoading,
    handleAddItem,
    handleDeleteItem,
    handleMarkSent,
    handleMarkAccepted,
    handleMarkRejected,
    handleMarkExpired,
    handleMarkChangesRequested,
    handleReopen,
    handleDelete,
    handleExportPdf,
    handleCopyLink,
    handleDuplicate,
    handleConvertToTask,
    refetch,
  };
}
