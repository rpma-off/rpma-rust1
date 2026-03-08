'use client';

import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useNewQuotePage } from '@/domains/quotes';
import {
  QuotePartsSection,
  QuoteLaborSection,
  QuoteNotesEditor,
  QuoteVehicleCustomerCard,
  QuoteDetailsCard,
  QuoteTotalsCard,
} from '@/domains/quotes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/shared/ui/animations/FadeIn';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewQuotePage() {
  const {
    loading,
    validUntil,
    parts,
    labor,
    taxRate,
    discountType,
    discountValue,
    publicNote,
    internalNote,
    customerId,
    clientName,
    clientEmail,
    clientPhone,
    clientType,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehiclePlate,
    vehicleVin,
    partsSubtotal,
    laborSubtotal,
    isFormValid,
    customerOptions,
    clientsLoading,
    setValidUntil,
    setParts,
    setLabor,
    setTaxRate,
    setDiscountType,
    setDiscountValue,
    setPublicNote,
    setInternalNote,
    setCustomerId,
    setClientName,
    setClientEmail,
    setClientPhone,
    setClientType,
    setVehicleMake,
    setVehicleModel,
    setVehicleYear,
    setVehiclePlate,
    setVehicleVin,
    refetchClients,
    handleSubmit,
  } = useNewQuotePage();

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <FadeIn>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Header - rpma-shell pattern */}
          <div className="rpma-shell p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link
                  href="/quotes"
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm">Retour aux devis</span>
                </Link>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-600/20 rounded-full">
                    <FileText className="h-8 w-8 text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Nouveau devis</h1>
                    <p className="text-muted-foreground mt-1">Créez un nouveau devis pour un client</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/quotes">
                  <Button variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Créer le devis
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
                <CardHeader>
                  <CardTitle>Contenu du devis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <QuotePartsSection parts={parts} onChange={setParts} />
                  <QuoteLaborSection laborItems={labor} onChange={setLabor} />
                  <QuoteNotesEditor
                    publicNote={publicNote}
                    internalNote={internalNote}
                    onPublicNoteChange={setPublicNote}
                    onInternalNoteChange={setInternalNote}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar (1/3) */}
            <div className="space-y-6">
              {clientsLoading ? (
                <Card className="rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
                    <CardHeader>
                      <CardTitle>Client & Véhicule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QuoteVehicleCustomerCard
                        customerId={customerId}
                        customers={customerOptions}
                        onCustomerIdChange={setCustomerId}
                        clientName={clientName}
                        clientEmail={clientEmail}
                        clientPhone={clientPhone}
                        clientType={clientType}
                        onClientNameChange={setClientName}
                        onClientEmailChange={setClientEmail}
                        onClientPhoneChange={setClientPhone}
                        onClientTypeChange={setClientType}
                        vehicleMake={vehicleMake}
                        vehicleModel={vehicleModel}
                        vehicleYear={vehicleYear}
                        vehiclePlate={vehiclePlate}
                        vehicleVin={vehicleVin}
                        onVehicleMakeChange={setVehicleMake}
                        onVehicleModelChange={setVehicleModel}
                        onVehicleYearChange={setVehicleYear}
                        onVehiclePlateChange={setVehiclePlate}
                        onVehicleVinChange={setVehicleVin}
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
                    <CardHeader>
                      <CardTitle>Détails & Récapitulatif</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <QuoteDetailsCard
                        validUntil={validUntil}
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
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </form>
      </FadeIn>
    </div>
  );
}
