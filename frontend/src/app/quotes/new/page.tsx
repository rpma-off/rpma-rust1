'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCreateQuote } from '@/domains/quotes';
import { useClients } from '@/domains/clients';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/domains/auth';
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
import type {
  CreateQuoteRequest,
  QuotePartInput,
  QuoteLaborInput,
  QuoteStatus,
} from '@/shared/types';
import { PageHeader } from '@/components/ui/page-header';
import { FadeIn } from '@/shared/ui/animations/FadeIn';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewQuotePage() {
  const router = useRouter();
  const { createQuote, loading, error } = useCreateQuote();
  const { user } = useAuth();
  const { clients, refetch: refetchClients } = useClients({ autoFetch: true });

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('draft');
  const [validUntil, setValidUntil] = useState('');
  const [parts, setParts] = useState<QuotePartInput[]>([]);
  const [labor, setLabor] = useState<QuoteLaborInput[]>([]);
  const [taxRate, setTaxRate] = useState(20);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [publicNote, setPublicNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId.trim()) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (parts.length === 0 && labor.length === 0) {
      toast.error('Ajoutez au moins une pièce ou de la main d\'œuvre');
      return;
    }

    const items = [
      ...parts.map((p, index) => ({
        kind: 'material' as const,
        label: p.name,
        description: p.part_number || undefined,
        qty: p.quantity,
        unit_price: Math.round(p.unit_price * 100),
        tax_rate: taxRate,
        position: index,
      })),
      ...labor.map((l, index) => ({
        kind: 'labor' as const,
        label: l.description,
        description: undefined,
        qty: l.hours,
        unit_price: Math.round(l.rate * 100),
        tax_rate: taxRate,
        position: parts.length + index,
      })),
    ];

    const data: CreateQuoteRequest = {
      client_id: customerId,
      notes: publicNote || undefined,
      items,
      vehicle_plate: undefined,
      vehicle_make: undefined,
      vehicle_model: undefined,
    };

    const result = await createQuote(data);
    if (result) {
      toast.success('Devis créé avec succès');
      router.push(`/quotes/${result.id}`);
    }
  };

  // Convert subtotals from euros (form state) to cents for display in QuoteTotalsCard
  const partsSubtotal = parts.reduce((sum, p) => sum + Math.round(p.total * 100), 0);
  const laborSubtotal = labor.reduce((sum, l) => sum + Math.round(l.total * 100), 0);

  const isFormValid = customerId.trim() && (parts.length > 0 || labor.length > 0);

  const customerOptions = (clients || []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    company: (c as any).company_name || null,
  }));

  const clientsLoading = !clients;

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
