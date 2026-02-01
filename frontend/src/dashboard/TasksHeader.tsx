'use client';

import React from 'react';

interface TasksHeaderProps {
  taskCount: number;
  onStatusFilterChange: (status: string) => void;
  onTechnicianSelect: (technician: string) => void;
  activeFilter: string;
  selectedTechnician: string;
  technicians: Array<{ 
    id: string; 
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    email?: string | null;
    initials: string;
  }>;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ 
  taskCount, 
  onStatusFilterChange, 
  onTechnicianSelect, 
  activeFilter, 
  selectedTechnician, 
  technicians 
}) => (
  <div className="bg-card rounded-lg shadow-sm p-4 mb-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tâches</h2>
        <p className="text-sm text-muted-foreground">
          {taskCount} tâche{taskCount !== 1 ? 's' : ''} affichée{taskCount !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Statut:</label>
          <select
            value={activeFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Tous les statuts">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
          </select>
        </div>

        {/* Technician Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Technicien:</label>
          <select
            value={selectedTechnician}
            onChange={(e) => onTechnicianSelect(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Tous les techniciens">Tous les techniciens</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim()}>
                {tech.name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim() || 'Sans nom'}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  </div>
);

export default TasksHeader;
