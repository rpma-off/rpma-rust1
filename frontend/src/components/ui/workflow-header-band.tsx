import React from 'react';
import { cn } from '@/lib/utils';
import { Thermometer, Droplets, Ruler, CheckCircle, AlertTriangle } from 'lucide-react';

type WorkflowHeaderBandProps = {
  stepLabel: string;
  title: string;
  subtitle: string;
  temperature?: number | null;
  humidity?: number | null;
  surfaceValue?: string;
  surfaceLabel?: string;
  className?: string;
  layout?: 'compact' | 'detailed';
  density?: 'normal' | 'tight';
  showEnvIcons?: boolean;
  showAutoSaveChip?: boolean;
  hasEnvironmentalData?: boolean;
};

const formatNumber = (value?: number | null, suffix?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '\u2014';
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return suffix ? `${formatted}${suffix}` : formatted;
};

const getEnvStatus = (value: number | null | undefined, min: number, max: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { label: 'N/A', icon: null, color: 'text-white/40' };
  }
  if (value >= min && value <= max) {
    return { label: '\u2713 Optimal', icon: CheckCircle, color: 'text-emerald-100' };
  }
  return { label: '\u00c0 ajuster', icon: AlertTriangle, color: 'text-amber-100' };
};

export function WorkflowHeaderBand({
  stepLabel,
  title,
  subtitle,
  temperature,
  humidity,
  surfaceValue,
  surfaceLabel,
  className,
  layout = 'detailed',
  density = 'normal',
  showEnvIcons = true,
  showAutoSaveChip = false,
  hasEnvironmentalData = true,
}: WorkflowHeaderBandProps) {
  const tempStatus = getEnvStatus(temperature, 18, 25);
  const humidityStatus = getEnvStatus(humidity, 40, 60);
  const TempIcon = tempStatus.icon;
  const HumidityIcon = humidityStatus.icon;
  const isCompact = layout === 'compact';
  const isTight = density === 'tight';

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white',
        isTight ? 'px-5 py-3 border-b border-emerald-900/40' : 'px-5 py-4 border-b border-emerald-900/40 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className={cn('flex', isCompact ? 'items-center gap-4' : 'flex-col gap-2 lg:items-center lg:gap-4 lg:flex-row')}>
          <div className="inline-flex items-center gap-2">
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {stepLabel}
            </div>
            {showAutoSaveChip && hasEnvironmentalData && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-600/30 px-2.5 py-1 text-[10px] font-medium text-emerald-100 border border-emerald-500/30">
                <CheckCircle className="h-3 w-3" />
                <span>Sauvegarde auto</span>
              </div>
            )}
          </div>
          <div>
            <div className={cn(isCompact ? 'text-base font-extrabold' : 'text-lg sm:text-xl font-extrabold tracking-tight')}>{title}</div>
            <div className={cn(isCompact ? 'text-xs text-white/70' : 'text-xs text-white/70 font-medium')}>{subtitle}</div>
          </div>
        </div>

        <div className={cn('flex flex-wrap items-center gap-3', isCompact ? 'justify-end text-right' : 'justify-start lg:justify-end')}>
          {hasEnvironmentalData && (
            <>
              {isCompact ? (
                <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base font-extrabold text-emerald-100">{formatNumber(temperature, '\u00b0C')}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Temp\u00e9rature</span>
                    <span className="text-[9px] font-semibold text-emerald-100">{tempStatus.label}</span>
                  </div>
                  <div className="h-7 w-px bg-white/20" />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base font-extrabold text-sky-100">{formatNumber(humidity, '%')}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Humidit\u00e9</span>
                    <span className="text-[9px] font-semibold text-emerald-100">{humidityStatus.label}</span>
                  </div>
                  <div className="h-7 w-px bg-white/20" />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base font-extrabold">{surfaceValue ?? '\u2014'}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Surface</span>
                    <span className="text-[9px] font-semibold text-emerald-100">{surfaceLabel ?? 'PPF'}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        {showEnvIcons && <Thermometer className="h-3 w-3 text-sky-100" />}
                        <span className="text-base font-bold text-emerald-100">{formatNumber(temperature, '\u00b0C')}</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Temp\u00e9rature</span>
                      <span className={cn('text-[9px] font-semibold flex items-center gap-0.5', tempStatus.color)}>
                        {TempIcon && <TempIcon className="h-2.5 w-2.5" />}
                        {tempStatus.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        {showEnvIcons && <Droplets className="h-3 w-3 text-sky-100" />}
                        <span className="text-base font-bold text-sky-100">{formatNumber(humidity, '%')}</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Humidit\u00e9</span>
                      <span className={cn('text-[9px] font-semibold flex items-center gap-0.5', humidityStatus.color)}>
                        {HumidityIcon && <HumidityIcon className="h-2.5 w-2.5" />}
                        {humidityStatus.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-emerald-100" />
                        <span className="text-base font-bold text-emerald-100">{surfaceValue ?? '\u2014'}</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Surface</span>
                      <span className="text-[9px] font-semibold text-emerald-100">{surfaceLabel ?? 'PPF'}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {!hasEnvironmentalData && (
            <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 shadow-sm">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-emerald-100" />
                  <span className="text-base font-bold text-emerald-100">{surfaceValue ?? '\u2014'}</span>
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60">Surface</span>
                <span className="text-[9px] font-semibold text-emerald-100">{surfaceLabel ?? 'PPF'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
