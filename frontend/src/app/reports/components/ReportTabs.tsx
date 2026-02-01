'use client';

import {
  BarChart3,
  TrendingUp,
  Users,
  Car,
  Shield,
  Package,
  Map,
  Brain,
  Search
} from 'lucide-react';
import type { ReportType } from '@/lib/backend';

interface ReportTabsProps {
  selectedType: ReportType;
  onTypeChange: (type: ReportType) => void;
}

export function ReportTabs({ selectedType, onTypeChange }: ReportTabsProps) {
  const tabs = [
    {
      id: 'overview' as ReportType,
      label: 'Aperçu',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Vue d\'ensemble des performances'
    },
    {
      id: 'data_explorer' as ReportType,
      label: 'Explorateur de Données',
      icon: <Search className="h-4 w-4" />,
      description: 'Recherche et exploration des données'
    },
    {
      id: 'tasks' as ReportType,
      label: 'Tâches',
      icon: <Car className="h-4 w-4" />,
      description: 'Analyse des tâches et interventions'
    },
    {
      id: 'technicians' as ReportType,
      label: 'Techniciens',
      icon: <Users className="h-4 w-4" />,
      description: 'Performance des techniciens'
    },
    {
      id: 'clients' as ReportType,
      label: 'Clients',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Analytics clients et satisfaction'
    },
    {
      id: 'quality' as ReportType,
      label: 'Qualité',
      icon: <Shield className="h-4 w-4" />,
      description: 'Métriques de qualité et conformité'
    },
    {
      id: 'materials' as ReportType,
      label: 'Matériaux',
      icon: <Package className="h-4 w-4" />,
      description: 'Utilisation et coûts des matériaux'
    },
     {
       id: 'geographic' as ReportType,
       label: 'Géographique',
       icon: <Map className="h-4 w-4" />,
       description: 'Analyse géographique et cartes de chaleur'
     },
     {
       id: 'operational_intelligence' as ReportType,
       label: 'Intelligence Opérationnelle',
       icon: <Brain className="h-4 w-4" />,
       description: 'Goulots d\'étranglement et optimisation des processus'
     }
  ];

  return (
    <div className="border-b border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
      <nav className="flex space-x-2 px-6 py-4 overflow-x-auto" aria-label="Report Categories">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTypeChange(tab.id)}
            className={`
              group flex items-center space-x-4 px-5 py-4 rounded-xl font-medium text-sm transition-all duration-300 relative overflow-hidden min-w-max
              ${
                selectedType === tab.id
                  ? 'bg-gradient-to-r from-green-500/15 to-green-600/15 text-green-400 border border-green-500/30 shadow-xl shadow-green-500/20 scale-105'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/60 border border-transparent hover:border-gray-600/40 hover:shadow-lg hover:shadow-gray-500/10'
              }
            `}
          >
            {/* Background gradient effect */}
            <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300 ${
              selectedType === tab.id
                ? 'from-green-500/30 to-green-600/30'
                : 'from-gray-500/20 to-gray-600/20'
            }`} />

            {/* Icon with enhanced background */}
            <div className={`relative p-3 rounded-xl transition-all duration-300 shadow-lg ${
              selectedType === tab.id
                ? 'bg-gradient-to-br from-green-500/30 to-green-600/30 text-green-400 shadow-green-500/20'
                : 'bg-gradient-to-br from-gray-700/60 to-gray-600/60 text-gray-400 group-hover:from-gray-600/60 group-hover:to-gray-500/60 group-hover:text-gray-300 shadow-gray-500/10'
            }`}>
              {tab.icon}
            </div>

            {/* Content with better typography */}
            <div className="relative flex flex-col items-start text-left">
              <span className={`font-bold text-sm tracking-wide ${
                selectedType === tab.id ? 'text-green-400' : 'text-gray-300 group-hover:text-white'
              }`}>
                {tab.label}
              </span>
              <span className={`text-xs mt-1 leading-tight max-w-32 ${
                selectedType === tab.id ? 'text-green-400/80' : 'text-gray-500 group-hover:text-gray-400'
              }`}>
                {tab.description}
              </span>
            </div>

            {/* Active indicator with glow */}
            {selectedType === tab.id && (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg shadow-green-500/50" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/5 to-green-600/5 animate-pulse" />
              </>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}