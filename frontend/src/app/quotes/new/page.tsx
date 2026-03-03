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

export default function NewQuotePage() {
  const router = useRouter();
  const { createQuote, loading, error } = useCreateQuote();
  const { user } = useAuth();
  const { clients } = useClients({ autoFetch: true });

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

  return (
    <PageShell>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/quotes" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau devis</h1>
            <p className="text-sm text-gray-500 mt-1">
              Créez un nouveau devis pour un client
            </p>
          </div>
        </div>

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

          <ResizablePanel defaultSize={25} minSize={20} className="p-6 bg-gray-50">
            <div className="space-y-6">
              <QuoteVehicleCustomerCard
                customerId={customerId}
                vehicleId={vehicleId}
                customers={customerOptions}
                vehicles={[]}
                onCustomerIdChange={setCustomerId}
                onVehicleIdChange={setVehicleId}
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
            </div>
          </ResizablePanel>
        </ResizableGroup>

        <div className="flex justify-end gap-3">
          <Link
            href="/quotes"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Créer le devis
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
