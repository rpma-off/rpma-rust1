'use client';

import { Droplets, Thermometer } from 'lucide-react';

type Environment = {
  temp_celsius: number | null;
  humidity_percent: number | null;
};

interface InspectionEnvironmentCardProps {
  environment: Environment;
  onChange: (env: Environment) => void;
}

export function InspectionEnvironmentCard({ environment, onChange }: InspectionEnvironmentCardProps) {
  return (
    <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">🌡 Conditions Atelier</div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          ● Mesure atelier
        </span>
      </div>
      <div className="flex items-center gap-4 rounded-md border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] px-3 py-2">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-lg font-extrabold text-orange-500">{environment.temp_celsius ?? '—'}°C</span>
          <span className="text-[10px] font-semibold text-muted-foreground">TEMPÉRATURE</span>
          <span className="text-[9px] font-semibold text-emerald-600">✓ Optimal</span>
        </div>
        <div className="h-7 w-px bg-[hsl(var(--rpma-border))]" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-lg font-extrabold text-sky-500">{environment.humidity_percent ?? '—'}%</span>
          <span className="text-[10px] font-semibold text-muted-foreground">HUMIDITÉ</span>
          <span className="text-[9px] font-semibold text-emerald-600">✓ Optimal</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5 text-orange-500" />
            Température relevée (°C)
          </span>
          <input
            type="number"
            className="rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
            value={environment.temp_celsius ?? ''}
            onChange={(event) =>
              onChange({
                ...environment,
                temp_celsius: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
          <span className="text-[10px] text-emerald-600">✓ Zone 18-25°C</span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-sky-500" />
            Humidité relative (%)
          </span>
          <input
            type="number"
            className="rounded-md border border-[hsl(var(--rpma-border))] px-3 py-2 text-sm"
            value={environment.humidity_percent ?? ''}
            onChange={(event) =>
              onChange({
                ...environment,
                humidity_percent: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
          <span className="text-[10px] text-emerald-600">✓ Zone 40-60%</span>
        </label>
      </div>
    </div>
  );
}
