'use client';

import type { InterventionReportViewModel } from '../../services/report-view-model.types';

interface ReportPreviewWorkConditionsProps {
  workConditions: InterventionReportViewModel['workConditions'];
  materials: InterventionReportViewModel['materials'];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const isMissing = value === 'Non renseigné';
  return (
    <div className="flex justify-between items-baseline gap-2 py-1 border-b border-border/40 last:border-0 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={isMissing ? 'text-muted-foreground italic' : 'font-medium text-foreground text-right'}>{value}</dd>
    </div>
  );
}

export function ReportPreviewWorkConditions({ workConditions, materials }: ReportPreviewWorkConditionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Conditions de travail</h3>
        <dl className="space-y-0">
          <InfoRow label="Météo" value={workConditions.weather} />
          <InfoRow label="Éclairage" value={workConditions.lighting} />
          <InfoRow label="Lieu" value={workConditions.location} />
          <InfoRow label="Température" value={workConditions.temperature} />
          <InfoRow label="Humidité" value={workConditions.humidity} />
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Matériaux</h3>
        <dl className="space-y-0">
          <InfoRow label="Type de film" value={materials.filmType} />
          <InfoRow label="Marque" value={materials.filmBrand} />
          <InfoRow label="Modèle" value={materials.filmModel} />
        </dl>
      </div>
    </div>
  );
}
