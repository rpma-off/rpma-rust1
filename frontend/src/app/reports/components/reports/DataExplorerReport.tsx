'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { reportsService } from '@/lib/services/entities/reports.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DataExplorerReport() {
    const [query, setQuery] = useState('');
    const [entityType, setEntityType] = useState('tasks');
    const [data, setData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const handleSearch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await reportsService.searchRecords(query, entityType);
            if (response.success && response.data) {
                setData(response.data.results);
                setTotalCount(response.data.total_count);
            } else {
                setError(response.error || 'Impossible de récupérer les données');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    }, [query, entityType]);

    useEffect(() => {
        // Initial fetch
        handleSearch();
    }, [entityType, handleSearch]); // Refetch when entity type changes

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                    <label className="text-sm font-medium mb-2 block">Type d&apos;entité</label>
                    <Select value={entityType} onValueChange={setEntityType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une entité" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* Values map to backend entity keys */}
                            <SelectItem value="tasks">Tâches</SelectItem>
                            <SelectItem value="clients">Clients</SelectItem>
                            <SelectItem value="interventions">Interventions</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full md:w-1/2">
                    <label className="text-sm font-medium mb-2 block">Requête de recherche</label>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par identifiant, nom ou autres champs..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-8"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Rechercher
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="rounded-md border bg-white dark:bg-slate-900">
                <div className="p-4 border-b bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        Résultats ({totalCount})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {data.length > 0 && Object.keys(data[0]).slice(0, 6).map((key) => (
                                    <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                                ))}
                                {data.length === 0 && <TableHead>Aucune donnée</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={data.length > 0 ? Object.keys(data[0]).slice(0, 6).length : 1} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                        <span className="sr-only">Chargement...</span>
                                    </TableCell>
                                </TableRow>
                            ) : data.length > 0 ? (
                                data.map((row, index) => (
                                    <TableRow key={index}>
                                        {Object.entries(row).slice(0, 6).map(([key, value]) => (
                                            <TableCell key={key} className="whitespace-nowrap max-w-[200px] truncate">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={1} className="h-24 text-center text-muted-foreground">
                                        Aucun résultat trouvé
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
