import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { CreateQuoteItemRequest, QuoteItemKind } from '@/shared/types';
import {
  useDeleteQuote,
  useQuote,
  useQuoteAttachments,
  useQuoteExportPdf,
  useQuoteItems,
  useQuoteStatus,
} from './useQuotes';

export type ActiveTab = 'details' | 'items' | 'images' | 'documents' | 'history';

export function useQuoteDetailPage(quoteId: string) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<QuoteItemKind>('service');
  const [newQty, setNewQty] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [newTaxRate] = useState(20);
  const [newDescription, setNewDescription] = useState('');

  const { quote, loading, error, refetch } = useQuote(quoteId);
  const { deleteQuote } = useDeleteQuote();
  const { addItem, deleteItem } = useQuoteItems();
  const { markSent, markAccepted, markRejected, loading: statusLoading } = useQuoteStatus();
  const { exportPdf, loading: exportLoading } = useQuoteExportPdf();
  const { attachments, loading: attachmentsLoading } = useQuoteAttachments(quoteId);

  const handleAddItem = async () => {
    if (!newLabel.trim() || !quoteId) {
      return;
    }

    const item: CreateQuoteItemRequest = {
      kind: newKind,
      label: newLabel,
      description: newDescription || undefined,
      qty: newQty,
      unit_price: Math.round(newUnitPrice * 100),
      tax_rate: newTaxRate,
      position: quote?.items.length || 0,
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
    if (!quoteId) {
      return;
    }

    await markSent(quoteId);
    await refetch();
  };

  const handleMarkAccepted = async () => {
    if (!quoteId) {
      return;
    }

    const result = await markAccepted(quoteId);
    if (result?.task_created) {
      toast.info(`Tâche créée: ${result.task_created.task_id}`);
    }

    await refetch();
  };

  const handleMarkRejected = async () => {
    if (!quoteId) {
      return;
    }

    await markRejected(quoteId);
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
    }

    setShowDeleteDialog(false);
  };

  const handleExportPdf = async () => {
    if (!quoteId) {
      return;
    }

    const result = await exportPdf(quoteId);
    if (result?.file_path) {
      toast.success(`PDF exporté: ${result.file_path}`);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  };

  const handleEmailQuote = () => {
    toast.info('Fonctionnalité de partage par email à venir');
  };

  const handleDuplicate = () => {
    toast.info('Fonctionnalité de duplication à venir');
  };

  const isDraft = quote?.status === 'draft';
  const isSent = quote?.status === 'sent';
  const isAccepted = quote?.status === 'accepted';
  const canConvert = isAccepted;

  return {
    quote,
    loading,
    error,
    attachments,
    attachmentsLoading,
    statusLoading,
    exportLoading,
    activeTab,
    setActiveTab,
    showConvertDialog,
    setShowConvertDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    showAddItem,
    setShowAddItem,
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
    canConvert,
    handleAddItem,
    handleDeleteItem,
    handleMarkSent,
    handleMarkAccepted,
    handleMarkRejected,
    handleDelete,
    handleExportPdf,
    handleCopyLink,
    handleEmailQuote,
    handleDuplicate,
    refetch,
  };
}

