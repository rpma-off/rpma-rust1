'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, CheckCircle, XCircle, FileDown,
  Plus, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {
  useQuote,
  useDeleteQuote,
  useQuoteItems,
  useQuoteStatus,
  useQuoteExportPdf,
  QuoteStatusBadge,
} from '@/domains/quotes';
import { formatCents } from '@/domains/quotes/utils/formatting';
import { PageShell } from '@/shared/ui/layout/PageShell';
import type { CreateQuoteItemRequest, QuoteItemKind } from '@/shared/types';

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;

  const { quote, loading, error, refetch } = useQuote(quoteId);
  const { deleteQuote } = useDeleteQuote();
  const { addItem, deleteItem } = useQuoteItems();
  const { markSent, markAccepted, markRejected, loading: statusLoading } = useQuoteStatus();
  const { exportPdf, loading: exportLoading } = useQuoteExportPdf();

  // Add item form state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<QuoteItemKind>('service');
  const [newQty, setNewQty] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [newTaxRate] = useState(20);

  const handleAddItem = useCallback(async () => {
    if (!newLabel.trim() || !quoteId) return;
    const item: CreateQuoteItemRequest = {
      kind: newKind,
      label: newLabel,
      qty: newQty,
      unit_price: Math.round(newUnitPrice * 100),
      tax_rate: newTaxRate,
      position: quote?.items.length || 0,
    };
    const result = await addItem(quoteId, item);
    if (result) {
      setShowAddItem(false);
      setNewLabel('');
      setNewQty(1);
      setNewUnitPrice(0);
      refetch();
    }
  }, [quoteId, newLabel, newKind, newQty, newUnitPrice, newTaxRate, quote?.items.length, addItem, refetch]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!quoteId) return;
      await deleteItem(quoteId, itemId);
      refetch();
    },
    [quoteId, deleteItem, refetch],
  );

  const handleMarkSent = async () => {
    if (!quoteId) return;
    await markSent(quoteId);
    refetch();
  };

  const handleMarkAccepted = async () => {
    if (!quoteId) return;
    const result = await markAccepted(quoteId);
    if (result?.task_created) {
      // Optionally navigate to the created task
      alert(`Tâche créée: ${result.task_created.task_id}`);
    }
    refetch();
  };

  const handleMarkRejected = async () => {
    if (!quoteId) return;
    await markRejected(quoteId);
    refetch();
  };

  const handleDelete = async () => {
    if (!quoteId) return;
    if (!confirm('Supprimer ce devis ?')) return;
    const deleted = await deleteQuote(quoteId);
    if (deleted) {
      router.push('/quotes');
    }
  };

  const handleExportPdf = async () => {
    if (!quoteId) return;
    const result = await exportPdf(quoteId);
    if (result?.file_path) {
      alert(`PDF exporté: ${result.file_path}`);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (error || !quote) {
    return (
      <PageShell>
        <div className="text-center py-20">
          <p className="text-red-600">{error?.message || 'Devis introuvable'}</p>
          <Link href="/quotes" className="mt-4 text-blue-600 hover:underline">
            ← Retour aux devis
          </Link>
        </div>
      </PageShell>
    );
  }

  const isDraft = quote.status === 'draft';
  const isSent = quote.status === 'sent';

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/quotes" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {quote.quote_number}
              </h1>
              <QuoteStatusBadge status={quote.status} showIcon={false} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button
                  onClick={handleMarkSent}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Envoyer
                </button>
                <button
                  onClick={handleMarkRejected}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Refuser
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </>
            )}
            {isSent && (
              <>
                <button
                  onClick={handleMarkAccepted}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Accepter
                </button>
                <button
                  onClick={handleMarkRejected}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Refuser
                </button>
              </>
            )}
            <button
              onClick={handleExportPdf}
              disabled={exportLoading}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Quote Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Informations</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Client ID</dt>
                <dd className="font-medium">{quote.client_id}</dd>
              </div>
              {quote.task_id && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tâche liée</dt>
                  <dd className="font-medium">
                    <Link href={`/tasks/${quote.task_id}`} className="text-blue-600 hover:underline">
                      {quote.task_id.slice(0, 8)}...
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Créé le</dt>
                <dd>{new Date(quote.created_at).toLocaleDateString('fr-FR')}</dd>
              </div>
              {quote.valid_until && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Valide jusqu&apos;au</dt>
                  <dd>{new Date(quote.valid_until).toLocaleDateString('fr-FR')}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Véhicule</h2>
            <dl className="space-y-2 text-sm">
              {quote.vehicle_plate && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Plaque</dt>
                  <dd className="font-medium">{quote.vehicle_plate}</dd>
                </div>
              )}
              {quote.vehicle_make && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Marque</dt>
                  <dd>{quote.vehicle_make}</dd>
                </div>
              )}
              {quote.vehicle_model && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Modèle</dt>
                  <dd>{quote.vehicle_model}</dd>
                </div>
              )}
              {quote.vehicle_year && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Année</dt>
                  <dd>{quote.vehicle_year}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Articles</h2>
            {isDraft && (
              <button
                onClick={() => setShowAddItem(!showAddItem)}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            )}
          </div>

          {/* Add item inline form */}
          {showAddItem && isDraft && (
            <div className="rounded-md border bg-gray-50 p-4 space-y-3">
              <div className="grid grid-cols-6 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Libellé</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newKind}
                    onChange={e => setNewKind(e.target.value as QuoteItemKind)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="service">Service</option>
                    <option value="labor">Main d&apos;œuvre</option>
                    <option value="material">Matériel</option>
                    <option value="discount">Remise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Qté</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newQty}
                    onChange={e => setNewQty(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">P.U. (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newUnitPrice}
                    onChange={e => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Items table */}
          {quote.items.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Aucun article</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Article</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">P.U.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TVA</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total HT</th>
                    {isDraft && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quote.items.map(item => {
                    const lineTotal = item.qty * item.unit_price;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm">{item.label}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{item.kind}</td>
                        <td className="px-4 py-2 text-right text-sm">{item.qty}</td>
                        <td className="px-4 py-2 text-right text-sm">{formatCents(item.unit_price)}</td>
                        <td className="px-4 py-2 text-right text-sm">{item.tax_rate ?? 0}%</td>
                        <td className="px-4 py-2 text-right text-sm font-medium">
                          {formatCents(lineTotal)}
                        </td>
                        {isDraft && (
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-4 space-y-1 text-right">
            <p className="text-sm text-gray-500">
              Sous-total HT: <span className="font-medium text-gray-900">{formatCents(quote.subtotal)}</span>
            </p>
            <p className="text-sm text-gray-500">
              TVA: <span className="font-medium text-gray-900">{formatCents(quote.tax_total)}</span>
            </p>
            <p className="text-lg font-bold text-gray-900">
              Total TTC: {formatCents(quote.total)}
            </p>
          </div>
        </div>

        {/* Notes & Terms */}
        {(quote.notes || quote.terms) && (
          <div className="rounded-lg border bg-white p-6 space-y-4">
            {quote.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Conditions</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
