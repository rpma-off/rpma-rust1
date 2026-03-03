import React from 'react';
import { WorkflowHeaderBand } from '@/components/ui/workflow-header-band';

type PpfHeaderBandProps = {
  stepLabel: string;
  title: string;
  subtitle: string;
  temperature?: number | null;
  humidity?: number | null;
  surfaceValue?: string;
  surfaceLabel?: string;
  className?: string;
};

export function PpfHeaderBand({
  stepLabel,
  title,
  subtitle,
  temperature,
  humidity,
  surfaceValue,
  surfaceLabel,
  className,
}: PpfHeaderBandProps) {
  return (
    <WorkflowHeaderBand
      stepLabel={stepLabel}
      title={title}
      subtitle={subtitle}
      temperature={temperature}
      humidity={humidity}
      surfaceValue={surfaceValue}
      surfaceLabel={surfaceLabel}
      hasEnvironmentalData
      showEnvIcons={false}
      showAutoSaveChip={false}
      layout="compact"
      density="tight"
      className={className}
    />
  );
}

