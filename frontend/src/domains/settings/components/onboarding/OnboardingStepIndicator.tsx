'use client';

import { CheckCircle2 } from 'lucide-react';

interface Step {
  id: number;
  title: string;
}

interface OnboardingStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function OnboardingStepIndicator({ steps, currentStep }: OnboardingStepIndicatorProps) {
  return (
    <div className="flex justify-center gap-4">
      {steps.map((s) => (
        <div
          key={s.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            currentStep >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          {currentStep > s.id ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4 flex items-center justify-center text-sm font-medium">
              {s.id}
            </span>
          )}
          <span className="text-sm font-medium">{s.title}</span>
        </div>
      ))}
    </div>
  );
}
