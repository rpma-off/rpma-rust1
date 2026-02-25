'use client';

import React from 'react';

type PpfQualitySliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function PpfQualitySlider({ value, onChange }: PpfQualitySliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">Score qualité pose (0-10)</label>
        <span className="text-sm font-bold text-emerald-600">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-600"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0 — Mauvais</span>
        <span>5 — Acceptable</span>
        <span>10 — Parfait</span>
      </div>
    </div>
  );
}
