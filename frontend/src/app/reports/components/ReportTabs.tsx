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
    <div className="bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
      <nav className="flex space-x-2 px-3 py-1 overflow-x-auto" aria-label="Report Categories">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTypeChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wide border-b-[3px] transition-colors min-w-max
              ${selectedType === tab.id ? 'border-white text-white font-semibold' : 'border-transparent text-white/85 hover:text-white'}
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
