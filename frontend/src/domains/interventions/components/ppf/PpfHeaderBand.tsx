import React from 'react';
import { cn } from '@/lib/utils';

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

const formatNumber = (value?: number | null, suffix?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return suffix ? `${formatted}${suffix}` : formatted;
};

const getStatus = (value: number | null | undefined, min: number, max: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value >= min && value <= max) return '✓ Optimal';
  return 'À ajuster';
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
    <div
      className={cn(
        'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white',
        'px-5 py-3 border-b border-emerald-900/40',
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {stepLabel}
          </div>
          <div>
            <div className="text-base font-extrabold">{title}</div>
            <div className="text-xs text-white/70">{subtitle}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-right">
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-extrabold text-emerald-100">
                {formatNumber(temperature, '°C')}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">
                Température
              </span>
              <span className="text-[9px] font-semibold text-emerald-100">
                {getStatus(temperature, 18, 25)}
              </span>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-extrabold text-sky-100">
                {formatNumber(humidity, '%')}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">
                Humidité
              </span>
              <span className="text-[9px] font-semibold text-emerald-100">
                {getStatus(humidity, 40, 60)}
              </span>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-extrabold">{surfaceValue ?? '—'}</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">
                Surface
              </span>
              <span className="text-[9px] font-semibold text-emerald-100">
                {surfaceLabel ?? 'PPF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
