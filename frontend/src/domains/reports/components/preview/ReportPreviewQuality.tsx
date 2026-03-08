'use client';

import { Camera } from 'lucide-react';
import type { InterventionReportViewModel } from '../../services/report-view-model.types';

interface ReportPreviewQualityProps {
  quality: InterventionReportViewModel['quality'];
  photos: InterventionReportViewModel['photos'];
}

export function ReportPreviewQuality({ quality, photos }: ReportPreviewQualityProps) {
  return (
    <div className="space-y-4">
      {/* Global score */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Qualité globale</h3>
          <span className="text-lg font-bold text-foreground">{quality.globalScore}</span>
        </div>

        {quality.checkpoints.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Étape</th>
                <th className="text-center text-xs font-medium text-muted-foreground pb-2">Statut</th>
                <th className="text-right text-xs font-medium text-muted-foreground pb-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {quality.checkpoints.map((cp, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  <td className="py-1.5 text-foreground">{cp.stepName}</td>
                  <td className="py-1.5 text-center text-muted-foreground text-xs">{cp.stepStatus}</td>
                  <td className="py-1.5 text-right font-medium text-foreground">{cp.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {quality.finalObservations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Observations finales</p>
            <ul className="space-y-1">
              {quality.finalObservations.map((obs, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  {obs}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            Photos
          </h3>
          <span className="text-sm font-medium text-foreground">{photos.totalCount} photo{photos.totalCount !== 1 ? 's' : ''}</span>
        </div>

        {photos.byStep.length > 0 && (
          <div className="space-y-1.5">
            {photos.byStep.map((group) => (
              <div key={group.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{group.label}</span>
                <span className="font-medium text-foreground tabular-nums">{group.count}</span>
              </div>
            ))}
          </div>
        )}

        {photos.totalCount === 0 && (
          <p className="text-sm text-muted-foreground italic">Aucune photo enregistrée.</p>
        )}
      </div>
    </div>
  );
}
