'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Send,
  CheckCircle,
  XCircle,
  FileDown,
  FileText,
  Plus,
  Trash2,
  Copy,
  MoreVertical,
  Clock,
  FileUp,
  Quote,
  Image,
  History,
} from 'lucide-react';
import {
  QuoteConvertDialog,
} from './QuoteConvertDialog';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { QuoteWorkflowPanel } from './QuoteWorkflowPanel';
import { formatCents } from '../utils/formatting';
import { useQuoteDetailPage } from '../hooks/useQuoteDetailPage';
import type { ActiveTab } from '../hooks/useQuoteDetailPage';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { PageHeader } from '@/shared/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/shared/ui/facade';
import type { QuoteItemKind } from '@/shared/types';
import { FadeIn } from '@/shared/ui/animations/FadeIn';

export function QuoteDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;
  const {
    quote,
    loading,
    error,
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
    canEdit,
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
    refetch,
  } = useQuoteDetailPage(quoteId);

  if (loading && !quote) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !quote) {
    return (
      <PageShell>
        <ErrorState message={error?.message || 'Devis introuvable'} onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const quoteItems = quote.items ?? [];

  const statusActions = (
    <>
      {isDraft && (
        <Button
          onClick={handleMarkSent}
          disabled={statusLoading}
          size="sm"
        >
          <Send className="mr-2 h-4 w-4" />
          Envoyer
        </Button>
      )}
      {isSent && (
        <>
          <Button
            onClick={handleMarkAccepted}
            disabled={statusLoading}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Accepter
          </Button>
          <Button
            onClick={handleMarkRejected}
            disabled={statusLoading}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Refuser
          </Button>
        </>
      )}
      <Button
        onClick={handleExportPdf}
        disabled={exportLoading}
        variant="outline"
        size="sm"
      >
        <FileDown className="mr-2 h-4 w-4" />
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Dupliquer
          </DropdownMenuItem>
          {isDraft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <PageShell>
      <PageHeader
        title={quote.quote_number}
        subtitle={`Créé le ${new Date(quote.created_at).toLocaleDateString('fr-FR')}`}
        icon={<Quote className="h-6 w-6 text-muted-foreground" />}
        actions={
          <div className="flex items-center gap-2">
            {statusActions}
          </div>
        }
      >
        <div className="flex items-center gap-2 mt-2">
          <QuoteStatusBadge status={quote.status} showIcon={false} />
          {quote.vehicle_plate && (
            <Badge variant="outline" className="font-mono">
              {quote.vehicle_plate}
            </Badge>
          )}
          {quote.vehicle_make && quote.vehicle_model && (
            <span className="text-sm text-muted-foreground">
              {quote.vehicle_make} {quote.vehicle_model}
            </span>
          )}
        </div>
      </PageHeader>

      {acceptedTaskId && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">
                Devis accepté — Task créée
              </p>
              <p className="text-sm text-green-700 mt-1">
                Une intervention a été initialisée.
              </p>
              <Link
                href={`/tasks/${acceptedTaskId}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900 mt-2"
              >
                Voir la Task →
              </Link>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Détails</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <Quote className="h-4 w-4" />
            <span className="hidden sm:inline">Articles</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Images</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileUp className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
        </TabsList>

        <FadeIn>
          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Informations générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground text-xs">Client ID</dt>
                        <dd className="font-medium">{quote.client_id}</dd>
                      </div>
                      {quote.task_id && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Tâche liée</dt>
                          <dd className="font-medium">
                            <Link href={`/tasks/${quote.task_id}`} className="text-blue-600 hover:underline">
                              {quote.task_id.slice(0, 8)}...
                            </Link>
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-muted-foreground text-xs">Statut</dt>
                        <dd><QuoteStatusBadge status={quote.status} showIcon={false} /></dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Date de création
                        </dt>
                        <dd className="font-medium">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</dd>
                      </div>
                      {quote.valid_until && (
                        <div>
                          <dt className="text-muted-foreground text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Valide jusqu&apos;au
                          </dt>
                          <dd className="font-medium">{new Date(quote.valid_until).toLocaleDateString('fr-FR')}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileUp className="h-5 w-5" />
                      Informations véhicule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      {quote.vehicle_plate && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Plaque</dt>
                          <dd className="font-medium font-mono">{quote.vehicle_plate}</dd>
                        </div>
                      )}
                      {quote.vehicle_make && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Marque</dt>
                          <dd className="font-medium">{quote.vehicle_make}</dd>
                        </div>
                      )}
                      {quote.vehicle_model && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Modèle</dt>
                          <dd className="font-medium">{quote.vehicle_model}</dd>
                        </div>
                      )}
                      {quote.vehicle_year && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Année</dt>
                          <dd className="font-medium">{quote.vehicle_year}</dd>
                        </div>
                      )}
                      {quote.vehicle_vin && (
                        <div className="col-span-2">
                          <dt className="text-muted-foreground text-xs">VIN</dt>
                          <dd className="font-mono text-xs">{quote.vehicle_vin}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {(quote.notes || quote.terms) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes et conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {quote.notes && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Notes</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                        </div>
                      )}
                      {quote.terms && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Conditions</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.terms}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Récapitulatif
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sous-total HT</span>
                      <span className="font-semibold">{formatCents(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">TVA</span>
                      <span className="font-semibold">{formatCents(quote.tax_total)}</span>
                    </div>
                    {quote.discount_amount && quote.discount_amount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm font-medium">Remise</span>
                        <span className="font-semibold">-{formatCents(quote.discount_amount)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total TTC</span>
                      <span className="text-2xl font-bold text-primary">{formatCents(quote.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <QuoteWorkflowPanel
                  quote={quote}
                  statusLoading={statusLoading}
                  exportLoading={exportLoading}
                  duplicateLoading={duplicateLoading}
                  onMarkSent={handleMarkSent}
                  onMarkAccepted={handleMarkAccepted}
                  onMarkRejected={handleMarkRejected}
                  onMarkExpired={handleMarkExpired}
                  onMarkChangesRequested={handleMarkChangesRequested}
                  onReopen={handleReopen}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onExportPdf={handleExportPdf}
                />
              </div>
            </div>
          </TabsContent>
          </FadeIn>

          <FadeIn>
            <TabsContent value="items" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Articles
                  </CardTitle>
                  {canEdit && (
                    <Button onClick={() => setShowAddItem(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un article
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {showAddItem && canEdit && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
                    <h3 className="text-sm font-medium text-blue-900">Nouvel article</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="col-span-2 md:col-span-3">
                        <Label htmlFor="newLabel">Libellé *</Label>
                        <Input id="newLabel" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex: PPF Capot" />
                      </div>
                      <div>
                        <Label htmlFor="newKind">Type</Label>
                        <select id="newKind" value={newKind} onChange={e => setNewKind(e.target.value as QuoteItemKind)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="service">Service</option>
                          <option value="labor">Main d&apos;œuvre</option>
                          <option value="material">Matériel</option>
                          <option value="discount">Remise</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="newQty">Quantité</Label>
                        <Input id="newQty" type="number" min="0.01" step="0.01" value={newQty} onChange={e => setNewQty(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label htmlFor="newUnitPrice">Prix unitaire (€)</Label>
                        <Input id="newUnitPrice" type="number" min="0" step="0.01" value={newUnitPrice} onChange={e => setNewUnitPrice(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newDescription">Description</Label>
                      <Textarea id="newDescription" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description optionnelle de l'article" rows={2} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => { setShowAddItem(false); setNewLabel(''); setNewDescription(''); }}>Annuler</Button>
                      <Button type="button" onClick={handleAddItem} disabled={!newLabel.trim()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                {quoteItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Aucun article</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {canEdit ? 'Ajoutez votre premier article' : 'Ce devis ne contient aucun article'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Article</th>
                          <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Qté</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">P.U.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Total</th>
                          {canEdit && <th className="px-4 py-3" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {quoteItems.map((item) => {
                          const lineTotal = Math.round(item.qty * item.unit_price);
                          return (
                            <tr key={item.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm font-medium">{item.label}</td>
                              <td className="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground">{item.description || '-'}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs normal-case">{item.kind}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-muted-foreground">{item.qty}</td>
                              <td className="px-4 py-3 text-right text-sm">{formatCents(item.unit_price)}</td>
                              <td className="px-4 py-3 text-right text-sm font-semibold">{formatCents(lineTotal)}</td>
                              {canEdit && (
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {quoteItems.length > 0 && (
                  <div className="border-t pt-4 space-y-2 text-right">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sous-total HT</span>
                      <span className="font-semibold">{formatCents(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">TVA</span>
                      <span className="font-semibold">{formatCents(quote.tax_total)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total TTC</span>
                      <span className="text-xl font-bold text-primary">{formatCents(quote.total)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </FadeIn>
        </Tabs>

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
          toast.success('Tâche créée avec succès');
          router.push(`/tasks/${taskId}`);
        }}
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
