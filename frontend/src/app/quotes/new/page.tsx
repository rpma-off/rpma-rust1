'use client';

import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { Button } from '@/components/ui/button';
import { useNewQuotePage } from '@/domains/quotes';
import {
  ResizableGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  QuotePartsSection,
  QuoteLaborSection,
  QuoteNotesEditor,
  QuoteVehicleCustomerCard,
  QuoteDetailsCard,
  QuoteTotalsCard,
} from '@/domains/quotes';
import { PageHeader } from '@/components/ui/page-header';
import { FadeIn } from '@/shared/ui/animations/FadeIn';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewQuotePage() {
  const {
    loading,
    title,
    status,
    validUntil,
    parts,
    labor,
    taxRate,
    discountType,
    discountValue,
    publicNote,
    internalNote,
    customerId,
    vehicleId,
    partsSubtotal,
    laborSubtotal,
    isFormValid,
    customerOptions,
    clientsLoading,
    setTitle,
    setStatus,
    setValidUntil,
    setParts,
    setLabor,
    setTaxRate,
    setDiscountType,
    setDiscountValue,
    setPublicNote,
    setInternalNote,
    setCustomerId,
    setVehicleId,
    refetchClients,
    handleSubmit,
  } = useNewQuotePage();

  return (
    <PageShell>
      <FadeIn>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="Nouveau devis"
            subtitle="Créez un nouveau devis pour un client"
            actions={
              <div className="flex items-center gap-2">
                <Link href="/quotes">
                  <Button variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Créer le devis
                </Button>
              </div>
            }
          >
            <Link href="/quotes" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux devis
            </Link>
          </PageHeader>

          <ResizableGroup className="min-h-[600px] border rounded-lg">
            <ResizablePanel defaultSize={75} minSize={50} className="p-6">
              <div className="space-y-6">
                <QuotePartsSection parts={parts} onChange={setParts} />
                <QuoteLaborSection laborItems={labor} onChange={setLabor} />
                <QuoteNotesEditor
                  publicNote={publicNote}
                  internalNote={internalNote}
                  onPublicNoteChange={setPublicNote}
                  onInternalNoteChange={setInternalNote}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={25} minSize={20} className="p-6 bg-muted/30">
              <div className="space-y-6">
                {clientsLoading ? (
                  <>
                    <div className="rounded-lg border p-3 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="rounded-lg border p-3 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="rounded-lg border p-3 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <QuoteVehicleCustomerCard
                      customerId={customerId}
                      vehicleId={vehicleId}
                      customers={customerOptions}
                      vehicles={[]}
                      onCustomerIdChange={setCustomerId}
                      onVehicleIdChange={setVehicleId}
                      refreshCustomers={refetchClients}
                    />
                    <QuoteDetailsCard
                      title={title}
                      status={status}
                      validUntil={validUntil}
                      onTitleChange={setTitle}
                      onStatusChange={setStatus}
                      onValidUntilChange={setValidUntil}
                    />
                    <QuoteTotalsCard
                      partsSubtotal={partsSubtotal}
                      laborSubtotal={laborSubtotal}
                      taxRate={taxRate}
                      discountType={discountType}
                      discountValue={discountValue}
                      onTaxRateChange={setTaxRate}
                      onDiscountTypeChange={setDiscountType}
                      onDiscountValueChange={setDiscountValue}
                    />
                  </>
                )}
              </div>
            </ResizablePanel>
          </ResizableGroup>
        </form>
      </FadeIn>
    </PageShell>
  );
}
