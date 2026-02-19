'use client';

import { useState, useEffect } from 'react';
import { X, Filter, Search, Users, Car, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';

interface ReportFilters {
  technicians?: string[];
  clients?: string[];
  statuses?: string[];
  priorities?: string[];
  ppfZones?: string[];
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApplyFilters: () => void;
}

export function AdvancedFilters({ isOpen, onClose, filters, onFiltersChange, onApplyFilters }: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - in real app, this would come from API
  const technicians = [
    { id: '1', name: 'Jean Dupont', active: true },
    { id: '2', name: 'Marie Martin', active: true },
    { id: '3', name: 'Pierre Durand', active: false },
    { id: '4', name: 'Sophie Leroy', active: true },
  ];

  const clients = [
    { id: '1', name: 'Auto Luxury', active: true },
    { id: '2', name: 'Premium Cars', active: true },
    { id: '3', name: 'Garage Central', active: false },
    { id: '4', name: 'Auto Plus', active: true },
  ];

  const statuses = [
    { id: 'pending', label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400' },
    { id: 'in_progress', label: 'En cours', color: 'bg-blue-500/20 text-blue-400' },
    { id: 'completed', label: 'Terminé', color: 'bg-green-500/20 text-green-400' },
    { id: 'cancelled', label: 'Annulé', color: 'bg-red-500/20 text-red-400' },
  ];

  const priorities = [
    { id: 'low', label: 'Faible', color: 'bg-gray-500/20 text-gray-400' },
    { id: 'medium', label: 'Moyen', color: 'bg-orange-500/20 text-orange-400' },
    { id: 'high', label: 'Élevé', color: 'bg-red-500/20 text-red-400' },
    { id: 'urgent', label: 'Urgent', color: 'bg-purple-500/20 text-purple-400' },
  ];

  const ppfZones = [
    { id: 'front_bumper', label: 'Pare-chocs avant' },
    { id: 'hood', label: 'Capot' },
    { id: 'roof', label: 'Toit' },
    { id: 'doors', label: 'Portes' },
    { id: 'rear_bumper', label: 'Pare-chocs arrière' },
  ];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (category: keyof ReportFilters, value: string, checked: boolean) => {
    setLocalFilters(prev => {
      const currentValues = prev[category] || [];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      return {
        ...prev,
        [category]: newValues.length > 0 ? newValues : undefined
      };
    });
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    setSearchTerm('');
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).reduce((count, filterArray) => {
      return count + (filterArray?.length || 0);
    }, 0);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rpma-shell w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Filter className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Filtres avancés</h2>
              <p className="text-sm text-gray-400">Affinez vos analyses avec des critères précis</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                {getActiveFilterCount()} filtre{getActiveFilterCount() > 1 ? 's' : ''} actif{getActiveFilterCount() > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Technicians */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-400" />
                  Techniciens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un technicien..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600"
                  />
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {technicians
                    .filter(tech => tech.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((tech) => (
                      <div key={tech.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`tech-${tech.id}`}
                          checked={localFilters.technicians?.includes(tech.id) || false}
                          onCheckedChange={(checked) =>
                            handleFilterChange('technicians', tech.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`tech-${tech.id}`}
                          className="flex-1 text-sm text-gray-300 cursor-pointer flex items-center justify-between"
                        >
                          <span>{tech.name}</span>
                          {tech.active ? (
                            <CheckCircle className="h-3 w-3 text-green-400" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-400" />
                          )}
                        </Label>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Clients */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <Car className="h-4 w-4 mr-2 text-green-400" />
                  Clients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {clients.map((client) => (
                    <div key={client.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`client-${client.id}`}
                        checked={localFilters.clients?.includes(client.id) || false}
                        onCheckedChange={(checked) =>
                          handleFilterChange('clients', client.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`client-${client.id}`}
                        className="flex-1 text-sm text-gray-300 cursor-pointer flex items-center justify-between"
                      >
                        <span>{client.name}</span>
                        {client.active ? (
                          <CheckCircle className="h-3 w-3 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-purple-400" />
                  Statuts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map((status) => (
                    <div key={status.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`status-${status.id}`}
                        checked={localFilters.statuses?.includes(status.id) || false}
                        onCheckedChange={(checked) =>
                          handleFilterChange('statuses', status.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`status-${status.id}`}
                        className={`flex-1 text-sm cursor-pointer px-2 py-1 rounded ${status.color}`}
                      >
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-400" />
                  Priorités
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {priorities.map((priority) => (
                    <div key={priority.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`priority-${priority.id}`}
                        checked={localFilters.priorities?.includes(priority.id) || false}
                        onCheckedChange={(checked) =>
                          handleFilterChange('priorities', priority.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`priority-${priority.id}`}
                        className={`flex-1 text-sm cursor-pointer px-2 py-1 rounded ${priority.color}`}
                      >
                        {priority.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PPF Zones */}
            <Card className="bg-gray-800/50 border-gray-700 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-cyan-400" />
                  Zones PPF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {ppfZones.map((zone) => (
                    <div key={zone.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`zone-${zone.id}`}
                        checked={localFilters.ppfZones?.includes(zone.id) || false}
                        onCheckedChange={(checked) =>
                          handleFilterChange('ppfZones', zone.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`zone-${zone.id}`}
                        className="flex-1 text-sm text-gray-300 cursor-pointer"
                      >
                        {zone.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))]">
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            disabled={getActiveFilterCount() === 0}
          >
            Effacer tout
          </Button>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 hover:bg-gray-800"
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

