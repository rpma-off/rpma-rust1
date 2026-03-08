'use client';

import type { InterventionReportViewModel } from '../../services/report-view-model.types';

interface ReportPreviewClientVehicleProps {
  client: InterventionReportViewModel['client'];
  vehicle: InterventionReportViewModel['vehicle'];
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

export function ReportPreviewClientVehicle({ client, vehicle }: ReportPreviewClientVehicleProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Client</h3>
        <dl className="space-y-0">
          <InfoRow label="Nom" value={client.name} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Téléphone" value={client.phone} />
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Véhicule</h3>
        <dl className="space-y-0">
          <InfoRow label="Immatriculation" value={vehicle.plate} />
          <InfoRow label="Marque" value={vehicle.make} />
          <InfoRow label="Modèle" value={vehicle.model} />
          <InfoRow label="Année" value={vehicle.year} />
          <InfoRow label="Couleur" value={vehicle.color} />
          <InfoRow label="VIN" value={vehicle.vin} />
        </dl>
      </div>
    </div>
  );
}
