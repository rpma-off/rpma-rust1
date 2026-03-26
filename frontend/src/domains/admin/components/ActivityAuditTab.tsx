'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button
} from '@/shared/ui/facade';
import { Activity, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useUserActivity } from '../hooks/useUserActivity';
import { ActivityFilterBar } from './ActivityFilterBar';
import { UserActivityTable } from './UserActivityTable';
import type { AuditActivityFilter } from '@/lib/backend';

const PAGE_SIZE = 50;

interface ActivityAuditTabProps {
  initialUserId?: string | null;
}

export function ActivityAuditTab({ initialUserId }: ActivityAuditTabProps) {
  const [filters, setFilters] = useState<AuditActivityFilter>({
    user_id: initialUserId || null,
    event_type: null,
    resource_type: null,
    start_date: undefined,
    end_date: undefined,
    limit: PAGE_SIZE,
    offset: 0,
  });

  // Update filters if initialUserId changes (e.g., when clicking "View Activity" for a new user)
  useEffect(() => {
    if (initialUserId) {
      setFilters(prev => ({
        ...prev,
        user_id: initialUserId,
        offset: 0
      }));
    }
  }, [initialUserId]);

  const { records, total, hasMore, loading, isFetching, error, refresh } = useUserActivity(filters);

  const handleFiltersChange = (newFilters: AuditActivityFilter) => {
    setFilters(newFilters);
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    const currentOffset = filters.offset || 0;
    const newOffset = direction === 'next' 
      ? currentOffset + PAGE_SIZE 
      : Math.max(0, currentOffset - PAGE_SIZE);
    
    setFilters({ ...filters, offset: newOffset });
  };

  const currentPage = Math.floor((filters.offset || 0) / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            Audit de l&apos;activité utilisateur
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Consultez et filtrez les événements système et les actions des utilisateurs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading || isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      <ActivityFilterBar 
        filters={filters} 
        onFiltersChange={handleFiltersChange} 
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
          <span className="font-bold">Erreur:</span> {error}
        </div>
      )}

      <div className="space-y-4">
        <UserActivityTable records={records} loading={loading} />
        
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-[hsl(var(--rpma-border))] pt-4">
            <div className="text-xs text-muted-foreground font-medium">
              Affichage de <span className="text-foreground">{(filters.offset || 0) + 1}</span> à <span className="text-foreground">{Math.min((filters.offset || 0) + PAGE_SIZE, total)}</span> sur <span className="text-foreground font-bold">{total}</span> événements
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Page <span className="font-bold text-foreground">{currentPage}</span> sur <span className="font-bold text-foreground">{totalPages || 1}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  disabled={(filters.offset || 0) === 0 || loading}
                  onClick={() => handlePageChange('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  disabled={!hasMore || loading}
                  onClick={() => handlePageChange('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
