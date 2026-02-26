import React from 'react';
import { cn } from '@/lib/utils';
import { Thermometer, Droplets, Ruler, CheckCircle, AlertTriangle } from 'lucide-react';

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

const formatNumber = (value?: number | null, suffix?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return suffix ? `${formatted}${suffix}` : formatted;
};

const getEnvStatus = (value: number | null | undefined, min: number, max: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { label: 'N/A', icon: null, color: 'text-white/40' };
  }
  if (value >= min && value <= max) {
    return { label: '✓ Optimal', icon: CheckCircle, color: 'text-emerald-100' };
  }
  return { label: 'À ajuster', icon: AlertTriangle, color: 'text-amber-100' };
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
  const tempStatus = getEnvStatus(temperature, 18, 25);
  const humidityStatus = getEnvStatus(humidity, 40, 60);
  const TempIcon = tempStatus.icon;
  const HumidityIcon = humidityStatus.icon;

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white',
        'px-5 py-4 border-b border-emerald-900/40 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:items-center lg:gap-4 lg:flex-row">
          <div className="inline-flex items-center gap-2">
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {stepLabel}
            </div>
            {hasEnvironmentalData && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-600/30 px-2.5 py-1 text-[10px] font-medium text-emerald-100 border border-emerald-500/30">
                <CheckCircle className="h-3 w-3" />
                <span>Sauvegarde auto</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-xs text-white/70 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          {hasEnvironmentalData && (
            <>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-sky-100" />
                    <span className="text-base font-bold text-emerald-100">
                      {formatNumber(temperature, '°C')}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    Température
                  </span>
                  <span className={`text-[9px] font-semibold flex items-center gap-0.5 ${tempStatus.color}`}>
                    {TempIcon && <TempIcon className="h-2.5 w-2.5" />}
                    {tempStatus.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-sky-100" />
                    <span className="text-base font-bold text-sky-100">
                      {formatNumber(humidity, '%')}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    Humidité
                  </span>
                  <span className={`text-[9px] font-semibold flex items-center gap-0.5 ${humidityStatus.color}`}>
                    {HumidityIcon && <HumidityIcon className="h-2.5 w-2.5" />}
                    {humidityStatus.label}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Ruler className="h-3 w-3 text-emerald-100" />
                <span className="text-base font-bold text-emerald-100">
                  {surfaceValue ?? '—'}
                </span>
              </div>
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
