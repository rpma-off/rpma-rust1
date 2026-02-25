import React from 'react';
import { cn } from '@/lib/utils';

type PpfStepHeroProps = {
  stepLabel: string;
  title: string;
  subtitle: string;
  meta?: string;
  badge?: string;
  rightSlot?: React.ReactNode;
  progressSegments?: { total: number; filled: number };
  gradientClassName?: string;
};

export function PpfStepHero({
  stepLabel,
  title,
  subtitle,
  meta,
  badge,
  rightSlot,
  progressSegments,
  gradientClassName,
}: PpfStepHeroProps) {
  const segments = progressSegments?.total ?? 0;
  const filled = progressSegments?.filled ?? 0;

  return (
    <div
      className={cn(
        'rounded-xl px-5 py-4 text-white shadow-sm',
        gradientClassName ?? 'bg-gradient-to-r from-sky-500 via-emerald-500 to-emerald-600'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {stepLabel}
            </span>
            {badge && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
                {badge}
              </span>
            )}
            {meta && <span className="text-xs text-white/70">{meta}</span>}
          </div>
          <div className="text-lg font-extrabold">{title}</div>
          <div className="text-xs text-white/70">{subtitle}</div>
        </div>
        {rightSlot && <div className="text-right">{rightSlot}</div>}
      </div>
      {segments > 0 && (
        <div className="mt-4 flex gap-1">
          {Array.from({ length: segments }).map((_, index) => (
            <div
              key={`seg-${index}`}
              className={cn(
                'h-1 flex-1 rounded-full',
                index < filled ? 'bg-white' : 'bg-white/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
