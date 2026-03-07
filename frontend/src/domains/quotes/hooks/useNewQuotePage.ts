'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateQuote } from './useQuotes';
import { useClients } from '@/domains/clients/api';
import { useAuth } from '@/domains/auth/api/useAuth';
import type {
  CreateQuoteRequest,
  QuotePartInput,
  QuoteLaborInput,
  QuoteStatus,
} from '@/shared/types';

export function useNewQuotePage() {
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
      toast.error("Ajoutez au moins une pièce ou de la main d'œuvre");
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

  const partsSubtotal = parts.reduce((sum, p) => sum + Math.round(p.total * 100), 0);
  const laborSubtotal = labor.reduce((sum, l) => sum + Math.round(l.total * 100), 0);
  const isFormValid = !!(customerId.trim() && (parts.length > 0 || labor.length > 0));

  const customerOptions = (clients || []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    company: (c as Record<string, unknown>).company_name as string | null,
  }));

  const clientsLoading = !clients;

  return {
    user,
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
  };
}
