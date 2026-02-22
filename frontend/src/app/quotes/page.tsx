'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useQuotesList } from '@/domains/quotes';
import { PageShell } from '@/shared/ui/layout/PageShell';
import type { QuoteStatus } from '@/shared/types';

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
};

const STATUS_ICONS: Record<QuoteStatus, typeof FileText> = {
  draft: FileText,
  sent: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock,
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}

export default function QuotesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');

  const { quotes, total, loading, error, updateFilters } = useQuotesList({
    autoFetch: true,
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    updateFilters({ search: value || undefined });
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status as QuoteStatus | '');
    updateFilters({
      status: status ? (status as QuoteStatus) : undefined,
    });
  };

  const stats = useMemo(() => {
    return {
      total,
      draft: quotes.filter(q => q.status === 'draft').length,
      sent: quotes.filter(q => q.status === 'sent').length,
      accepted: quotes.filter(q => q.status === 'accepted').length,
    };
  }, [quotes, total]);

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message);
    }
  }, [error]);

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} devis au total
            </p>
          </div>
          <Link
            href="/quotes/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Brouillons</p>
            <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Envoyés</p>
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Acceptés</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => handleStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="accepted">Accepté</option>
            <option value="rejected">Refusé</option>
            <option value="expired">Expiré</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        {/* Quote list */}
        {!loading && !error && quotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun devis</h3>
            <p className="mt-2 text-sm text-gray-500">
              Commencez par créer un nouveau devis.
            </p>
            <Link
              href="/quotes/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Créer un devis
            </Link>
          </div>
        )}

        {!loading && !error && quotes.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    N° Devis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Véhicule
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotes.map(quote => {
                  const StatusIcon = STATUS_ICONS[quote.status];
                  return (
                    <tr
                      key={quote.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {quote.quote_number}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[quote.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[quote.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {[quote.vehicle_make, quote.vehicle_model, quote.vehicle_plate]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCents(quote.total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                        {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
