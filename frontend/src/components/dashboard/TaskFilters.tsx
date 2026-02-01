'use client';

import React from 'react';
import { TaskFiltersProps } from './types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw, SortAsc, SortDesc } from 'lucide-react';

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  onSearch,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  technicianFilter,
  onTechnicianFilterChange,
  technicians,
  sortBy,
  sortOrder,
  onSortChange,
  onResetFilters,
  enableSearch = true,
  enableStatusFilter = true,
  enablePriorityFilter = true,
  enableTechnicianFilter = true,
  statusFilterOptions,
  priorityFilterOptions,
  className
}) => {
  const defaultStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'scheduled', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  const defaultPriorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'normale', label: 'Normal' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' }
  ];

  const statusOptions = statusFilterOptions || defaultStatusOptions;
  const priorityOptions = priorityFilterOptions || defaultPriorityOptions;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        {enableSearch && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Status Filter */}
        {enableStatusFilter && (
          <div className="sm:w-48">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Priority Filter */}
        {enablePriorityFilter && (
          <div className="sm:w-48">
            <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Technician Filter */}
        {enableTechnicianFilter && technicians?.length > 0 && (
          <div className="sm:w-48">
            <Select value={technicianFilter || 'all'} onValueChange={(value) => onTechnicianFilterChange(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name || `${tech.first_name} ${tech.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sort */}
        <div className="sm:w-48">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      </div>
    </div>
  );
};