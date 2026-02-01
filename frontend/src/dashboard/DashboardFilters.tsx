'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardFiltersProps {
  onStatusFilterChange: (status: string) => void;
  onTechnicianSelect: (techName: string) => void;
  technicians: Array<{ id: string; name: string | null }>;
  selectedTechnician: string;
  statusFilter: string;
}

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
];

const sortOptions = [
  { value: 'newest', label: 'Plus récent' },
  { value: 'oldest', label: 'Plus ancien' },
  { value: 'number_asc', label: 'N° croissant' },
  { value: 'number_desc', label: 'N° décroissant' },
  { value: 'date_asc', label: 'Date proche' },
  { value: 'date_desc', label: 'Date éloignée' },
];

export default function DashboardFilters({
  onStatusFilterChange,
  onTechnicianSelect,
  technicians,
  selectedTechnician,
  statusFilter,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState({
    status: true,
    technician: true,
    sort: true,
  });

  const toggleSection = (section: keyof typeof isOpen) => {
    setIsOpen(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filtres
        </h3>
      </div>

      {/* Status Filter */}
      <div className="border-b border-border">
        <button
          className="w-full px-4 py-3 text-left flex items-center justify-between text-sm font-medium text-muted-foreground hover:bg-muted/50"
          onClick={() => toggleSection('status')}
        >
          <span>Statut</span>
          {isOpen.status ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {isOpen.status && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-3 space-y-2"
            >
              {statusOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                    checked={statusFilter === option.value}
                    onChange={() => onStatusFilterChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Technician Filter */}
      <div className="border-b border-border">
        <button
          className="w-full px-4 py-3 text-left flex items-center justify-between text-sm font-medium text-muted-foreground hover:bg-muted/50"
          onClick={() => toggleSection('technician')}
        >
          <span>Technicien</span>
          {isOpen.technician ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {isOpen.technician && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto"
            >
              <label className="flex items-center space-x-2 text-sm text-muted-foreground">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={!selectedTechnician}
                  onChange={() => onTechnicianSelect('')}
                />
                <span>Tous les techniciens</span>
              </label>
              {technicians.map((tech) => (
                <label key={tech.id} className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                    checked={selectedTechnician === tech.id}
                    onChange={() => onTechnicianSelect(tech.id)}
                  />
                  <span>{tech.name || 'Sans technicien'}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sort Options */}
      <div>
        <button
          className="w-full px-4 py-3 text-left flex items-center justify-between text-sm font-medium text-muted-foreground hover:bg-muted/50"
          onClick={() => toggleSection('sort')}
        >
          <span>Trier par</span>
          {isOpen.sort ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {isOpen.sort && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-3 space-y-2"
            >
              {sortOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    name="sort"
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                    defaultChecked={option.value === 'number_desc'}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
