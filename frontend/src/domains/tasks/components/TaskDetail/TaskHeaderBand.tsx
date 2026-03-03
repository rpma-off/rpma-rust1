import React from 'react';
import { WorkflowHeaderBand } from '@/components/ui/workflow-header-band';

type TaskHeaderBandProps = {
  stepLabel: string;
  title: string;
  subtitle: string;
  temperature?: number | null;
  humidity?: number | null;
  surfaceValue?: string;
  surfaceLabel?: string;
  hasEnvironmentalData?: boolean;
  className?: string;
};

export function TaskHeaderBand({
  stepLabel,
  title,
  subtitle,
  temperature,
  humidity,
  surfaceValue,
  surfaceLabel,
  hasEnvironmentalData = false,
  className,
}: TaskHeaderBandProps) {
  return (
    <WorkflowHeaderBand
      stepLabel={stepLabel}
      title={title}
      subtitle={subtitle}
      temperature={temperature}
      humidity={humidity}
      surfaceValue={surfaceValue}
      surfaceLabel={surfaceLabel}
      hasEnvironmentalData={hasEnvironmentalData}
      showAutoSaveChip
      showEnvIcons
      layout="detailed"
      density="normal"
      className={className}
    />
  );
}

