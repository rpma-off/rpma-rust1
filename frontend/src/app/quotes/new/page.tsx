'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCreateQuote } from '@/domains/quotes';
import { ClientSelector } from '@/domains/clients';
import { PageShell } from '@/shared/ui/layout/PageShell';
import type { CreateQuoteRequest, CreateQuoteItemRequest, QuoteItemKind } from '@/shared/types';

export default function NewQuotePage() {
  const router = useRouter();
  const { createQuote, loading, error } = useCreateQuote();

  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [items, setItems] = useState<CreateQuoteItemRequest[]>([]);

  // New item form
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<QuoteItemKind>('service');
  const [newQty, setNewQty] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [newTaxRate] = useState(20);

  const addItem = () => {
    if (!newLabel.trim()) return;
    setItems(prev => [
      ...prev,
      {
        kind: newKind,
        label: newLabel,
        qty: newQty,
        unit_price: Math.round(newUnitPrice * 100), // Convert to cents
        tax_rate: newTaxRate,
        position: prev.length,
      },
    ]);
    setNewLabel('');
    setNewQty(1);
    setNewUnitPrice(0);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      setClientError('Veuillez sélectionner un client existant.');
      return;
    }
    setClientError(null);

    const data: CreateQuoteRequest = {
      client_id: clientId,
      notes: notes || undefined,
      terms: terms || undefined,
      vehicle_plate: vehiclePlate || undefined,
      vehicle_make: vehicleMake || undefined,
      vehicle_model: vehicleModel || undefined,
      vehicle_year: vehicleYear || undefined,
      items,
    };

    const result = await createQuote(data);
    if (result) {
      router.push(`/quotes/${result.id}`);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const taxTotal = items.reduce((sum, item) => {
    const lineTotal = item.qty * item.unit_price;
    return sum + (lineTotal * (item.tax_rate || 0)) / 100;
  }, 0);
  const total = subtotal + taxTotal;

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/quotes" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau devis</h1>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client */}
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Client</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <ClientSelector
                value={clientId || undefined}
                onValueChange={(id) => {
                  setClientId(id ?? '');
                  if (id) setClientError(null);
                }}
              />
              {clientError && (
                <p className="mt-1 text-sm text-red-600">{clientError}</p>
              )}
            </div>
          </div>

          {/* Vehicle */}
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Véhicule</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plaque
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={e => setVehiclePlate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marque
                </label>
                <input
                  type="text"
                  value={vehicleMake}
                  onChange={e => setVehicleMake(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modèle
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Année
                </label>
                <input
                  type="text"
                  value={vehicleYear}
                  onChange={e => setVehicleYear(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Articles</h2>

            {/* Existing items */}
            {items.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Article</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">P.U.</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TVA</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{item.label}</td>
                        <td className="px-4 py-2 text-right text-sm">{item.qty}</td>
                        <td className="px-4 py-2 text-right text-sm">{(item.unit_price / 100).toFixed(2)} €</td>
                        <td className="px-4 py-2 text-right text-sm">{item.tax_rate || 0}%</td>
                        <td className="px-4 py-2 text-right text-sm font-medium">
                          {((item.qty * item.unit_price) / 100).toFixed(2)} €
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add item form */}
            <div className="grid grid-cols-6 gap-2 items-end">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Libellé</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Ex: PPF Capot"
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
                  onClick={addItem}
                  className="w-full rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-1 text-right">
              <p className="text-sm text-gray-500">
                Sous-total: <span className="font-medium text-gray-900">{(subtotal / 100).toFixed(2)} €</span>
              </p>
              <p className="text-sm text-gray-500">
                TVA: <span className="font-medium text-gray-900">{(taxTotal / 100).toFixed(2)} €</span>
              </p>
              <p className="text-lg font-bold text-gray-900">
                Total: {(total / 100).toFixed(2)} €
              </p>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Notes et conditions</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conditions
              </label>
              <textarea
                value={terms}
                onChange={e => setTerms(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link
              href="/quotes"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading || !clientId.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le devis'}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

