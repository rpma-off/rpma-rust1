import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { 
  User, 
  Calendar, 
  Tag, 
  Hash, 
  ChevronUp, 
  ChevronDown,
  Code,
  Cpu,
  ClipboardList
} from 'lucide-react';
import { TaskWithDetails } from '@/types/task.types';

interface TechnicalDetailsCardProps {
  task: TaskWithDetails;
}

export function TechnicalDetailsCard({ task }: TechnicalDetailsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const technicalDetails = [
    {
      label: 'Créateur',
      icon: <User className="h-4 w-4 text-gray-400" />,
      value: task.created_by ? `ID: ${task.created_by}` : 'Système',
    },
    {
      label: 'Date de création',
      icon: <Calendar className="h-4 w-4 text-gray-400" />,
      value: task.created_at ? new Date(task.created_at as unknown as string).toLocaleDateString('fr-FR') : 'N/A',
    },
    {
      label: 'Priorité',
      icon: <Tag className="h-4 w-4 text-gray-400" />,
      value: task.priority || 'Normale',
    },
    {
      label: 'ID Externe',
      icon: <Hash className="h-4 w-4 text-gray-400" />,
      value: task.task_number || 'N/A',
    },
  ];

  const metadataDetails = [
    {
      label: 'Modèle véhicule',
      icon: <Code className="h-4 w-4 text-gray-400" />,
      value: task.vehicle_model || 'N/A',
    },
    {
      label: 'Année véhicule',
      icon: <Cpu className="h-4 w-4 text-gray-400" />,
      value: task.vehicle_year || 'N/A',
    },
    {
      label: 'Liste de contrôle',
      icon: <ClipboardList className="h-4 w-4 text-gray-400" />,
      value: task.checklist?.length ? `${task.checklist.length} éléments` : 'N/A',
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Détails Techniques</CardTitle>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-5 w-5" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="h-5 w-5" />
                Développer
              </>
            )}
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Technical Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {technicalDetails.map((detail, index) => (
            <div key={index} className="flex items-center space-x-3">
              {detail.icon}
              <div>
                <p className="text-sm text-gray-500">{detail.label}</p>
                <p className="text-sm font-medium">{detail.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expandable Metadata Section */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('metadata')}
            className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded"
          >
            <span className="font-medium">Métadonnées</span>
            {expandedSections.has('metadata') ? (
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
            )}
          </button>
          
          {expandedSections.has('metadata') && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
              {metadataDetails.map((detail, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {detail.icon}
                  <div>
                    <p className="text-sm text-gray-500">{detail.label}</p>
                    <p className="text-sm font-medium">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional expandable sections can be added here */}
      </CardContent>
    </Card>
  );
}