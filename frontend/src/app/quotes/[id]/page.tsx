'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, CheckCircle, XCircle, FileDown, FileText,
  Plus, Trash2, Copy, Share2, Mail, MoreVertical,
  Clock, Loader2, Eye, FileUp, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  useQuote,
  useDeleteQuote,
  useQuoteItems,
  useQuoteStatus,
  useQuoteExportPdf,
  useQuoteAttachments,
  QuoteStatusBadge,
  QuoteConvertDialog,
} from '@/domains/quotes';
import { QuoteImagesManager, QuoteDocumentsManager } from '@/domains/quotes/components';
import {
  QuoteCustomerResponse,
  QuotePublicLinkCard,
  QuoteShareDialog,
} from '@/domains/quotes/components';
import { formatCents } from '@/domains/quotes/utils/formatting';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { CreateQuoteItemRequest, QuoteItemKind } from '@/shared/types';
import { Badge } from '@/components/ui/badge';

type ActiveTab = 'details' | 'items' | 'images' | 'documents' | 'history';

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

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
    if (!newLabel.trim() || !quoteId) return;
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
    if (result) {
      setShowAddItem(false);
      setNewLabel('');
      setNewDescription('');
      setNewQty(1);
      setNewUnitPrice(0);
      refetch();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!quoteId) return;
    await deleteItem(quoteId, itemId);
    refetch();
  };

  const handleMarkSent = async () => {
    if (!quoteId) return;
    await markSent(quoteId);
    refetch();
  };

  const handleMarkAccepted = async () => {
    if (!quoteId) return;
    const result = await markAccepted(quoteId);
    if (result?.task_created) {
      toast.info(`Tâche créée: ${result.task_created.task_id}`);
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
    const deleted = await deleteQuote(quoteId);
    if (deleted) {
      toast.success('Devis supprimé');
      router.push('/quotes');
    }
    setShowDeleteDialog(false);
  };

  const handleExportPdf = async () => {
    if (!quoteId) return;
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

  const hasCustomerResponse = quote?.customer_message &&
    (quote.status === 'changes_requested' || quote.status === 'accepted' || quote.status === 'rejected');

  const hasPublicLink = quote?.public_token;

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
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-red-600">{error?.message || 'Devis introuvable'}</p>
          <Link href="/quotes" className="mt-4 text-blue-600 hover:underline">
            ← Retour aux devis
          </Link>
        </div>
      </PageShell>
    );
  }

  const isDraft = quote.status === 'draft';
  const isSent = quote.status === 'sent';
  const isAccepted = quote.status === 'accepted';
  const canConvert = isAccepted;

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/quotes" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {quote.quote_number}
                </h1>
                <QuoteStatusBadge status={quote.status} showIcon={false} />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button
                  onClick={handleMarkSent}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                  Envoyer
                </Button>
                <Button
                  onClick={() => setShowShareDialog(true)}
                  variant="outline"
                  className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>
              </>
            )}
            {isSent && (
              <>
                <Button
                  onClick={handleMarkAccepted}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Accepter
                </Button>
                <Button
                  onClick={handleMarkRejected}
                  disabled={statusLoading}
                  variant="outline"
                  className="inline-flex items-center gap-1 rounded-md border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Refuser
                </Button>
              </>
            )}
            <Button
              onClick={handleExportPdf}
              disabled={exportLoading}
              variant="outline"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le lien
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailQuote}>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer par email
                </DropdownMenuItem>
                {canConvert && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowConvertDialog(true)}
                      className="text-purple-600"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Convertir en tâche
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Dupliquer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="items">Articles</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-6">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informations générales
                  </h2>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <dt className="text-gray-500">Client ID</dt>
                      <dd className="font-medium">{quote.client_id}</dd>
                    </div>
                    {quote.task_id && (
                      <div className="flex justify-between border-b pb-2">
                        <dt className="text-gray-500">Tâche liée</dt>
                        <dd className="font-medium">
                          <Link href={`/tasks/${quote.task_id}`} className="text-blue-600 hover:underline">
                            {quote.task_id.slice(0, 8)}...
                          </Link>
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between border-b pb-2">
                      <dt className="text-gray-500">Statut</dt>
                      <dd><QuoteStatusBadge status={quote.status} showIcon={false} /></dd>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <dt className="text-gray-500 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Date de création
                      </dt>
                      <dd className="font-medium">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</dd>
                    </div>
                    {quote.valid_until && (
                      <div className="flex justify-between pb-2">
                        <dt className="text-gray-500 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Valide jusqu'au
                        </dt>
                        <dd className="font-medium">{new Date(quote.valid_until).toLocaleDateString('fr-FR')}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="rounded-lg border bg-white p-6">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                    <FileUp className="h-4 w-4" />
                    Informations véhicule
                  </h2>
                  <dl className="space-y-3 text-sm">
                    {quote.vehicle_plate && (
                      <div className="flex justify-between border-b pb-2">
                        <dt className="text-gray-500">Plaque</dt>
                        <dd className="font-medium">{quote.vehicle_plate}</dd>
                      </div>
                    )}
                    {quote.vehicle_make && (
                      <div className="flex justify-between border-b pb-2">
                        <dt className="text-gray-500">Marque</dt>
                        <dd className="font-medium">{quote.vehicle_make}</dd>
                      </div>
                    )}
                    {quote.vehicle_model && (
                      <div className="flex justify-between border-b pb-2">
                        <dt className="text-gray-500">Modèle</dt>
                        <dd className="font-medium">{quote.vehicle_model}</dd>
                      </div>
                    )}
                    {quote.vehicle_year && (
                      <div className="flex justify-between border-b pb-2">
                        <dt className="text-gray-500">Année</dt>
                        <dd className="font-medium">{quote.vehicle_year}</dd>
                      </div>
                    )}
                    {quote.vehicle_vin && (
                      <div className="flex justify-between pb-2">
                        <dt className="text-gray-500">VIN</dt>
                        <dd className="font-medium font-mono text-xs">{quote.vehicle_vin}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-6">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Récapitulatif
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sous-total HT</span>
                      <span className="text-lg font-semibold text-gray-900">{formatCents(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">TVA</span>
                      <span className="text-lg font-semibold text-gray-900">{formatCents(quote.tax_total)}</span>
                    </div>
                    {quote.discount_amount && quote.discount_amount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm font-medium">Remise</span>
                        <span className="text-lg font-semibold">-{formatCents(quote.discount_amount)}</span>
                      </div>
                    )}
                    <div className="h-px bg-gray-200 my-4" />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-gray-900">Total TTC</span>
                      <span className="text-2xl font-bold text-blue-600">{formatCents(quote.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-6 space-y-3">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Actions rapides
                  </h2>
                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowShareDialog(true)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Partager le devis
                    </Button>
                    {isSent && (
                      <Button
                        onClick={handleEmailQuote}
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Envoyer par email
                      </Button>
                    )}
                    {canConvert && (
                      <Button
                        onClick={() => setShowConvertDialog(true)}
                        className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Convertir en tâche
                      </Button>
                    )}
                  </div>
                </div>

                {hasPublicLink && (
                  <QuotePublicLinkCard
                    publicToken={quote.public_token || null}
                    sharedAt={quote.shared_at || null}
                    viewCount={quote.view_count || 0}
                    lastViewedAt={quote.last_viewed_at || null}
                    onRevoke={() => toast.info('Fonctionnalité de révocation à venir')}
                  />
                )}
              </div>
            </div>

            {hasCustomerResponse && (
              <QuoteCustomerResponse
                status={quote.status}
                customerMessage={quote.customer_message || null}
                updatedAt={quote.updated_at}
                loading={false}
                onResolve={() => toast.info('Fonctionnalité de résolution à venir')}
              />
            )}

            {(quote.notes || quote.terms) && (
              <div className="rounded-lg border bg-white p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes et conditions
                </h2>
                {quote.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
                {quote.terms && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Conditions</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.terms}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <div className="rounded-lg border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Articles</h2>
                {isDraft && (
                  <Button onClick={() => setShowAddItem(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un article
                  </Button>
                )}
              </div>

              {showAddItem && isDraft && (
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Nouvel article</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <Label htmlFor="newLabel">Libellé *</Label>
                      <Input
                        id="newLabel"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        placeholder="Ex: PPF Capot"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newKind">Type</Label>
                      <select
                        id="newKind"
                        value={newKind}
                        onChange={e => setNewKind(e.target.value as QuoteItemKind)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="service">Service</option>
                        <option value="labor">Main d'œuvre</option>
                        <option value="material">Matériel</option>
                        <option value="discount">Remise</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="newQty">Quantité</Label>
                      <Input
                        id="newQty"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newQty}
                        onChange={e => setNewQty(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newUnitPrice">Prix unitaire (€)</Label>
                      <Input
                        id="newUnitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newUnitPrice}
                        onChange={e => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <Label htmlFor="newDescription">Description</Label>
                    <Textarea
                      id="newDescription"
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      placeholder="Description optionnelle de l'article"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddItem(false);
                        setNewLabel('');
                        setNewDescription('');
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!newLabel.trim()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              )}

              {quote.items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-4 text-sm text-gray-500">Aucun article</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {isDraft ? 'Ajoutez votre premier article' : 'Contactez le support pour ajouter des articles'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Article
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Qté
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          P.U.
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Total
                        </th>
                        {isDraft && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quote.items.map((item) => {
                        const lineTotal = item.qty * item.unit_price;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.label}
                            </td>
                            <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                              {item.description || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs normal-case">
                                {item.kind}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {item.qty}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900">
                              {formatCents(item.unit_price)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              {formatCents(lineTotal)}
                            </td>
                            {isDraft && (
                              <td className="px-4 py-3 text-right">
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

              <div className="border-t pt-4 space-y-2 text-right">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sous-total HT</span>
                  <span className="text-base font-semibold text-gray-900">{formatCents(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">TVA</span>
                  <span className="text-base font-semibold text-gray-900">{formatCents(quote.tax_total)}</span>
                </div>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total TTC</span>
                  <span className="text-xl font-bold text-blue-600">{formatCents(quote.total)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="images">
            {attachmentsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <QuoteImagesManager
                quoteId={quoteId}
                initialImages={attachments?.filter(a => a.mime_type?.startsWith('image/')) || []}
              />
            )}
          </TabsContent>

          <TabsContent value="documents">
            {attachmentsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <QuoteDocumentsManager
                quoteId={quoteId}
                initialDocuments={attachments?.filter(a => !a.mime_type?.startsWith('image/')) || []}
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-lg border bg-white p-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Historique</h3>
              <p className="mt-2 text-sm text-gray-500">
                L'historique des modifications sera bientôt disponible.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <QuoteConvertDialog
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        initialVehicleInfo={{
          plate: quote.vehicle_plate || '',
          make: quote.vehicle_make || '',
          model: quote.vehicle_model || '',
          year: quote.vehicle_year || '',
          vin: quote.vehicle_vin || '',
        }}
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        onSuccess={(taskId) => {
          toast.success(`Tâche créée avec succès`);
          router.push(`/tasks/${taskId}`);
        }}
      />

      <QuoteShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        organizationId=""
        initialToken={quote.public_token || null}
        customer={null}
        smsEnabled={false}
        emailEnabled={false}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le devis</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le devis <strong>{quote.quote_number}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
