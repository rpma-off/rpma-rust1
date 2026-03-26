"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  XCircle,
  FileDown,
  FileText,
  Trash2,
  Copy,
  MoreVertical,
  FileUp,
  Quote,
  Image,
  History,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/layout/PageShell";
import { PageHeader } from "@/shared/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ErrorState, LoadingState } from "@/shared/ui/facade";
import { FadeIn } from "@/shared/ui/animations/FadeIn";
import { formatDate } from "@/shared/utils/date-formatters";
import { PPF_ZONES } from "@/domains/tasks";
import type { ActiveTab } from "../hooks/useQuoteDetailPage";
// ❌ CROSS-DOMAIN IMPORT — TODO(ADR-002): Move to shared/ or use public index
import { useQuoteDetailPage } from "../hooks/useQuoteDetailPage";
import { QuoteDetailsTab } from "./QuoteDetailsTab";
import { QuoteItemsTab } from "./QuoteItemsTab";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { QuoteConvertDialog } from "./QuoteConvertDialog";

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
    isAccepted,
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
  } = useQuoteDetailPage(quoteId);

  const convertVehicleInfo = useMemo(
    () => ({
      plate: quote?.vehicle_plate || "",
      make: quote?.vehicle_make || "",
      model: quote?.vehicle_model || "",
      year: quote?.vehicle_year || "",
      vin: quote?.vehicle_vin || "",
      ppfZones: [],
    }),
    [
      quote?.vehicle_plate,
      quote?.vehicle_make,
      quote?.vehicle_model,
      quote?.vehicle_year,
      quote?.vehicle_vin,
    ],
  );

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
        <ErrorState
          message={error?.message || "Devis introuvable"}
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  const handleOpenAddItem = () => setShowAddItem(true);
  const handleCancelAddItem = () => {
    setShowAddItem(false);
    setNewLabel("");
    setNewDescription("");
  };

  const statusActions = (
    <>
      {isDraft && (
        <Button onClick={handleMarkSent} disabled={statusLoading} size="sm">
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
      {isAccepted && !quote.task_id && (
        <Button
          onClick={handleConvertToTask}
          disabled={convertLoading}
          size="sm"
          variant="default"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Convert to Task
        </Button>
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
        subtitle={`Créé le ${formatDate(quote.created_at)}`}
        icon={<Quote className="h-6 w-6 text-muted-foreground" />}
        actions={<div className="flex items-center gap-2">{statusActions}</div>}
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

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActiveTab)}
      >
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
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Lucide Image icon is an SVG, not an img element */}
            <Image className="h-4 w-4" aria-hidden="true" />
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
            <QuoteDetailsTab
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
              onOpenConvertDialog={() => setShowConvertDialog(true)}
            />
          </TabsContent>
        </FadeIn>

        <FadeIn>
          <TabsContent value="items" className="space-y-6 mt-6">
            <QuoteItemsTab
              quote={quote}
              canEdit={canEdit}
              showAddItem={showAddItem}
              newLabel={newLabel}
              newKind={newKind}
              newQty={newQty}
              newUnitPrice={newUnitPrice}
              newDescription={newDescription}
              onOpenAddItem={handleOpenAddItem}
              onCancelAddItem={handleCancelAddItem}
              onNewLabelChange={setNewLabel}
              onNewKindChange={setNewKind}
              onNewQtyChange={setNewQty}
              onNewUnitPriceChange={setNewUnitPrice}
              onNewDescriptionChange={setNewDescription}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
            />
          </TabsContent>
        </FadeIn>
      </Tabs>

      <QuoteConvertDialog
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        initialVehicleInfo={convertVehicleInfo}
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        onSuccess={(taskId) => {
          toast.success("Tâche créée avec succès");
          router.push(`/tasks/${taskId}`);
        }}
        availableZones={PPF_ZONES}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le devis</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le devis{" "}
              <strong>{quote.quote_number}</strong> ? Cette action est
              irréversible.
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
