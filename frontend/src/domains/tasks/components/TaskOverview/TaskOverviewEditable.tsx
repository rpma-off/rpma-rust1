'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type { UpdateTaskRequest } from '@/lib/backend';
import type { TaskWithDetails } from '@/types/task.types';
import { useInlineEditTask } from '../../hooks/useInlineEditTask';
import {
  AssignmentAndNotesSection,
  PpfAndClientSection,
  VehicleAndPlanningSection,
} from './TaskOverviewSections';

interface TaskOverviewEditableProps {
  task: TaskWithDetails;
  defaultExpandedSections?: string[];
}

export function TaskOverviewEditable({
  task,
  defaultExpandedSections = [],
}: TaskOverviewEditableProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(defaultExpandedSections),
  );

  const { canEdit, getDisabledReason, editField } = useInlineEditTask({
    taskId: task.id,
  });

  const completedChecklistCount = useMemo(
    () => task.checklist_items?.filter((item) => item.is_completed).length ?? 0,
    [task.checklist_items],
  );

  const toggleSection = (section: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleVehicleFieldEdit = useCallback(
    async (
      field: 'vehicle_plate' | 'vehicle_make' | 'vehicle_model' | 'vehicle_year' | 'vin',
      value: string,
    ): Promise<boolean> => editField(field, value || null),
    [editField],
  );

  const handleCustomerFieldEdit = useCallback(
    async (
      field: 'customer_name' | 'customer_email' | 'customer_phone' | 'customer_address',
      value: string,
    ): Promise<boolean> => editField(field, value || null),
    [editField],
  );

  const handleScheduleFieldEdit = useCallback(
    async (
      field: 'scheduled_date' | 'start_time' | 'end_time',
      value: string,
    ): Promise<boolean> => editField(field, value || null),
    [editField],
  );

  const handleNotesEdit = useCallback(
    async (value: string): Promise<boolean> => editField('notes', value || null),
    [editField],
  );

  const handleLotFilmEdit = useCallback(
    async (value: string): Promise<boolean> => editField('lot_film', value || null),
    [editField],
  );

  const typedEditField = useCallback(
    <K extends keyof UpdateTaskRequest>(field: K, value: UpdateTaskRequest[K]) =>
      editField(field, value),
    [editField],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground md:text-xl">
          Vue d&apos;ensemble de l&apos;intervention
        </h2>
      </div>

      <VehicleAndPlanningSection
        task={task}
        canEdit={canEdit}
        getDisabledReason={getDisabledReason}
        handleVehicleFieldEdit={handleVehicleFieldEdit}
        handleScheduleFieldEdit={handleScheduleFieldEdit}
        editField={typedEditField}
        completedChecklistCount={completedChecklistCount}
      />

      <PpfAndClientSection
        task={task}
        canEdit={canEdit}
        getDisabledReason={getDisabledReason}
        handleLotFilmEdit={handleLotFilmEdit}
        handleCustomerFieldEdit={handleCustomerFieldEdit}
      />

      <AssignmentAndNotesSection
        task={task}
        canEdit={canEdit}
        getDisabledReason={getDisabledReason}
        handleNotesEdit={handleNotesEdit}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />
    </div>
  );
}
