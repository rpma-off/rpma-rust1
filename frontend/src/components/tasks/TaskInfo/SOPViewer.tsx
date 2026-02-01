'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SOPTemplate } from '@/types/task.types';

export interface SOPViewerProps {
  template?: SOPTemplate | null;
  stepNumber?: number;
  taskId?: string;
}

/**
 * Component to display SOP template information
 */
export function SOPViewer({ template, stepNumber: _stepNumber, taskId: _taskId }: SOPViewerProps) {
  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Procédure Opérationnelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune procédure opérationnelle définie
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Procédure Opérationnelle
          <Badge variant="outline">{template.is_active ? 'Actif' : 'Inactif'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {template.description}
              </p>
            )}
          </div>

          {template.version && (
            <div className="text-sm">
              <span className="font-medium">Version:</span> {template.version}
            </div>
          )}

          {/* TODO: Add estimated_duration_minutes to SOPTemplate interface */}
          {/* {template.estimated_duration_minutes && (
            <div className="text-sm">
              <span className="font-medium">Durée estimée:</span> {template.estimated_duration_minutes} minutes
            </div>
          )} */}
        </div>
      </CardContent>
    </Card>
  );
}