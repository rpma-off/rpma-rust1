'use client';

import React from 'react';
import { Eye, Car, Users, FileText, Calendar, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SearchResult, EntityType } from '@/lib/backend';

interface ResultsTableProps {
  results: SearchResult[];
  onRecordSelect: (record: SearchResult) => void;
  selectedRecordId?: string;
}

export function ResultsTable({ results, onRecordSelect, selectedRecordId }: ResultsTableProps) {
  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'task':
        return <Car className="h-4 w-4 text-blue-400" />;
      case 'client':
        return <Users className="h-4 w-4 text-green-400" />;
      case 'intervention':
        return <FileText className="h-4 w-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-400" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <div
          key={result.id}
          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedRecordId === result.id
              ? 'bg-blue-500/10 border-blue-500/50 shadow-lg'
              : 'bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] hover:bg-white/70 hover:border-[hsl(var(--rpma-border))]'
          }`}
          onClick={() => onRecordSelect(result)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                {getEntityIcon(result.entity_type)}
                <h4 className="text-foreground font-medium line-clamp-1 flex-1">
                  {result.title}
                </h4>
                {result.status && (
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 ${getStatusColor(result.status)}`}
                  >
                    {getStatusIcon(result.status)}
                    {result.status === 'completed' ? 'Terminé' :
                     result.status === 'in_progress' ? 'En cours' :
                     result.status === 'pending' ? 'En attente' :
                     result.status === 'cancelled' ? 'Annulé' :
                     result.status === 'active' ? 'Actif' : result.status}
                  </Badge>
                )}
              </div>

              {/* Subtitle */}
              <p className="text-muted-foreground text-sm mb-2 line-clamp-1">
                {result.subtitle}
              </p>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {result.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(result.date)}
                  </div>
                )}

                {/* Entity-specific metadata */}
                {result.entity_type === 'task' && result.metadata?.vehiclePlate && (
                  <div className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    {result.metadata.vehiclePlate}
                  </div>
                )}

                {result.entity_type === 'client' && result.metadata?.totalTasks && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {result.metadata.totalTasks} tâches
                  </div>
                )}

                {result.entity_type === 'intervention' && result.metadata?.interventionType && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {result.metadata.interventionType}
                  </div>
                )}
              </div>
            </div>

            {/* Action */}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onRecordSelect(result);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
