'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Database, FileText, Users, Car, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchBar } from './SearchBar';
import { EntitySelector } from './EntitySelector';
import { ResultsTable } from './ResultsTable';
import { RecordDetailPanel } from './RecordDetailPanel';
import { useSearchRecords } from '@/hooks/useSearchRecords';
import type { DateRange as BackendDateRange, SearchFilters, SearchResult, EntityType } from '@/lib/backend';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  technicians?: string[];
  clients?: string[];
  statuses?: string[];
  priorities?: string[];
  ppfZones?: string[];
}

interface DataExplorerProps {
  dateRange?: DateRange;
  filters?: ReportFilters;
}



export function DataExplorer({ dateRange, filters }: DataExplorerProps) {
  // Memoize default values to prevent unnecessary re-renders
  const defaultDateRange = useMemo((): DateRange => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date()
  }), []);

  const defaultFilters = useMemo((): ReportFilters => ({}), []);

  const effectiveDateRange = dateRange || defaultDateRange;
  const effectiveFilters = filters || defaultFilters;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('task');
  const [selectedRecord, setSelectedRecord] = useState<SearchResult | null>(null);

  // Use the search hook
  const {
    search,
    results: searchResults,
    loading,
    error,
    clearResults
  } = useSearchRecords({ limit: 50 });

  // Convert frontend types to backend types
  const toBackendDateRange = (range: DateRange): BackendDateRange => ({
    start: range.start.toISOString(),
    end: range.end.toISOString()
  });

  const toBackendFilters = (filters: ReportFilters): SearchFilters => ({
    technician_ids: filters.technicians || null,
    client_ids: filters.clients || null,
    statuses: filters.statuses || null,
    priorities: filters.priorities || null,
    ppf_zones: filters.ppfZones || null,
    vehicle_models: null,
  });

  // Convert backend SearchResult to local SearchResult
  const convertToLocalResult = (result: any): SearchResult => ({
    id: result.id,
    entity_type: result.entity_type as EntityType,
    title: result.title,
    subtitle: result.subtitle,
    status: result.status,
    date: result.date,
    metadata: result.metadata || {}
  });

  // Debounce search query to prevent excessive requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query, entity type, or filters change
  useEffect(() => {
    if (debouncedSearchQuery.trim() || selectedEntityType) {
      const backendDateRange = effectiveDateRange ? toBackendDateRange(effectiveDateRange) : undefined;
      const backendFilters = effectiveFilters ? toBackendFilters(effectiveFilters) : undefined;

      search(debouncedSearchQuery, selectedEntityType, backendDateRange, backendFilters);
    } else {
      clearResults();
    }
  }, [debouncedSearchQuery, selectedEntityType, effectiveDateRange, effectiveFilters, search, clearResults]);

  const handleRecordSelect = (record: SearchResult) => {
    setSelectedRecord(record);
  };

  const handleCloseDetail = () => {
    setSelectedRecord(null);
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'task':
        return <Car className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      case 'intervention':
        return <FileText className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };



  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Exploration des Données</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Recherchez et explorez les tâches, clients et interventions
          </p>
        </div>
        <Button
          onClick={() => {
            const backendDateRange = effectiveDateRange ? toBackendDateRange(effectiveDateRange) : undefined;
            const backendFilters = effectiveFilters ? toBackendFilters(effectiveFilters) : undefined;
            search(debouncedSearchQuery, selectedEntityType, backendDateRange, backendFilters);
          }}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-6">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Rechercher dans ${selectedEntityType === 'task' ? 'les tâches' : selectedEntityType === 'client' ? 'les clients' : 'les interventions'}...`}
            />

            <EntitySelector
              selectedType={selectedEntityType}
              onTypeChange={setSelectedEntityType}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-foreground flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getEntityIcon(selectedEntityType)}
                </div>
                Résultats
                <Badge variant="secondary" className="ml-auto">
                  {searchResults.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Recherche en cours...</p>
                </motion.div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Erreur de recherche
                  </h3>
                  <p className="text-muted-foreground text-sm">{error}</p>
                </motion.div>
              ) : searchResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Aucun résultat trouvé
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery
                      ? `Aucun résultat pour "${searchQuery}"`
                      : `Aucune donnée ${selectedEntityType === 'task' ? 'de tâche' : selectedEntityType === 'client' ? 'client' : 'd\'intervention'} trouvée`
                    }
                  </p>
                </motion.div>
              ) : (
                <ResultsTable
                  results={searchResults.map(convertToLocalResult)}
                  onRecordSelect={handleRecordSelect}
                  selectedRecordId={selectedRecord?.id}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RecordDetailPanel
              record={selectedRecord}
              onClose={handleCloseDetail}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}