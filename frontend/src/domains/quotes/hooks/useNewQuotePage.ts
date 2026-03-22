'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  CreateQuoteRequest,
  QuotePartInput,
  QuoteLaborInput,
} from '@/shared/types';
import { useClients } from '@/shared/hooks/useClients';
import { useAuth } from '@/shared/hooks/useAuth';
import { clientIpc,   } from '@/domains/clients';
import { useCreateQuote } from './useQuotes';

export function useNewQuotePage() {
  const router = useRouter();
  const { createQuote, loading, error } = useCreateQuote();
  const submittingRef = useRef(false);
  const { user } = useAuth();
  const { clients, refetch: refetchClients } = useClients({ autoFetch: true });

  const [validUntil, setValidUntil] = useState('');
  const [parts, setParts] = useState<QuotePartInput[]>([]);
  const [labor, setLabor] = useState<QuoteLaborInput[]>([]);
  const [taxRate, setTaxRate] = useState(20);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [publicNote, setPublicNote] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Client: either selected from list (customerId) or filled inline
  const [customerId, setCustomerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientType, setClientType] = useState<'individual' | 'business'>('individual');

  // Vehicle fields (inline on the quote)
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submittingRef.current) return;
    if (!user?.token) return;

    if (parts.length === 0 && labor.length === 0) {
      toast.error("Ajoutez au moins une pièce ou de la main d'œuvre");
      return;
    }

    submittingRef.current = true;
    try {
      // Resolve client ID: use existing selection or create inline
      let resolvedClientId = customerId.trim();
      if (!resolvedClientId) {
        if (!clientName.trim()) {
          toast.error('Veuillez renseigner le nom du client');
          return;
        }
        try {
          const newClient = await clientIpc.create(
            {
              name: clientName.trim(),
              email: clientEmail.trim() || null,
              phone: clientPhone.trim() || null,
              customer_type: clientType,
              address_street: null,
              address_city: null,
              address_state: null,
              address_zip: null,
              address_country: null,
              tax_id: null,
              company_name: null,
              contact_person: null,
              notes: null,
              tags: null,
            },
          );
          resolvedClientId = newClient.id;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('already exists')) {
            const existing = clients?.find(c => c.email && clientEmail.trim() && c.email === clientEmail.trim());
            if (existing) {
              resolvedClientId = existing.id;
            } else {
              toast.error('Un client avec cet email existe déjà. Sélectionnez-le dans la liste.');
              return;
            }
          } else {
            toast.error('Erreur lors de la création du client');
            return;
          }
        }
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

      // Convert validUntil string to timestamp if provided
      let validUntilTimestamp: number | null = null;
      if (validUntil) {
        const date = new Date(validUntil);
        if (!isNaN(date.getTime())) {
          validUntilTimestamp = date.getTime();
        }
      }

      const data: CreateQuoteRequest = {
        client_id: resolvedClientId,
        notes: publicNote || undefined,
        terms: internalNote || undefined,
        discount_type: discountType === 'none' ? undefined : discountType,
        discount_value: discountType === 'none' ? undefined : discountType === 'fixed' ? Math.round(discountValue * 100) : discountValue,
        valid_until: validUntilTimestamp,
        items,
        vehicle_make: vehicleMake.trim() || undefined,
        vehicle_model: vehicleModel.trim() || undefined,
        vehicle_year: vehicleYear.trim() || undefined,
        vehicle_plate: vehiclePlate.trim() || undefined,
        vehicle_vin: vehicleVin.trim() || undefined,
      };

      let result;
      try {
        result = await createQuote(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la création du devis';
        toast.error(msg);
        return;
      }
      if (result) {
        toast.success('Devis créé avec succès');
        router.push(`/quotes/${result.id}`);
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const partsSubtotal = parts.reduce((sum, p) => sum + Math.round(p.total * 100), 0);
  const laborSubtotal = labor.reduce((sum, l) => sum + Math.round(l.total * 100), 0);
  const hasClient = !!(customerId.trim() || clientName.trim());
  const isFormValid = hasClient && (parts.length > 0 || labor.length > 0);

  const customerOptions = (clients || []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    company: (c as Record<string, unknown>).company_name as string | null,
  }));

  const clientsLoading = !clients;

  return {
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
  };
}
