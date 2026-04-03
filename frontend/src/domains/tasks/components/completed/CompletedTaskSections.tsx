'use client';

import { useCallback, useEffect } from 'react';
import {
  Camera,
  CheckCircle,
  CheckSquare,
  FileText,
  MessageSquare,
  Package,
  Signature,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { resolveLocalImageUrl } from '@/shared/utils/media';
import { formatDateTime } from '@/shared/utils/date-formatters';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { MaterialConsumption } from '@/shared/types/inventory.types';
import { useTranslation } from '@/shared/hooks';

export function ChecklistSection({
  checklistItems,
  checklistCount,
  checklistTotal,
}: {
  checklistItems: {
    id: string;
    is_completed: boolean;
    description: string;
    completed_at?: string | null;
    notes?: string | null;
  }[];
  checklistCount: number;
  checklistTotal: number;
}) {
  const { t } = useTranslation();
  if (checklistItems.length === 0 && checklistTotal === 0) return null;

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckSquare className="h-5 w-5 text-success" />
          {t('completed.checklistSection')}
        </CardTitle>
        <CardDescription>
          {t('completed.checklistProgress', { completed: checklistCount, total: checklistTotal })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {checklistItems.length > 0 ? (
          <div className="divide-y divide-border">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5">
                <CheckCircle
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${item.is_completed ? 'text-success' : 'text-muted-foreground/30'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground/50' : 'text-foreground'}`}>
                    {item.description}
                  </p>
                  {item.completed_at && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                      {formatDateTime(item.completed_at)}
                    </p>
                  )}
                  {item.notes && <p className="mt-0.5 text-xs italic text-muted-foreground">{item.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">
            Checklist QC finale: {checklistCount}/{checklistTotal}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function QualitySection({
  fullInterventionData,
}: {
  fullInterventionData: {
    customer_satisfaction: number | null;
    quality_score: number | null;
    final_observations?: string[] | null;
    customer_signature?: unknown;
    customer_comments?: string | null;
  } | null;
}) {
  const { t } = useTranslation();
  if (!fullInterventionData) return null;

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-warning" />
          {t('completed.qualitySection')}
        </CardTitle>
        <CardDescription>{t('completed.qualityDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(fullInterventionData.customer_satisfaction !== null ||
          fullInterventionData.quality_score !== null) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fullInterventionData.customer_satisfaction !== null && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-warning">
                    {t('completed.customerSatisfaction')}
                  </div>
                  <Star className="h-4 w-4 text-warning" />
                </div>
                <div className="mb-2 text-3xl font-bold text-warning">
                  {fullInterventionData.customer_satisfaction}/5
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, index) => (
                    <span
                      key={index}
                      className={`text-lg ${index < fullInterventionData.customer_satisfaction! ? 'text-warning' : 'text-warning/20'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}

            {fullInterventionData.quality_score !== null && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    {t('completed.qualityScore')}
                  </div>
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mb-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {fullInterventionData.quality_score}%
                </div>
                <div className="h-2 w-full rounded-full bg-purple-500/20">
                  <div
                    className="h-2 rounded-full bg-purple-600 dark:bg-purple-400 transition-all duration-500"
                    style={{ width: `${fullInterventionData.quality_score}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!!fullInterventionData.final_observations?.length && (
          <>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                {t('completed.finalObservations')}
              </div>
              <div className="space-y-2">
                {fullInterventionData.final_observations.map((observation, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span className="text-sm text-foreground">{observation}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {(fullInterventionData.customer_signature || fullInterventionData.customer_comments) && (
          <>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Signature className="h-4 w-4 text-info" />
                {t('completed.signatureComments')}
              </div>
              <div className="rounded-xl border border-info/20 bg-info/5 p-4">
                {Boolean(fullInterventionData.customer_signature) && (
                  <div className="mb-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-info">
                      {t('completed.signer')}
                    </div>
                    {String(fullInterventionData.customer_signature ?? '').startsWith('data:image/') ? (
                      <img
                        src={String(fullInterventionData.customer_signature)}
                        alt="Signature client"
                        className="max-h-24 rounded border border-info/20 bg-white p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-foreground">
                        {String(fullInterventionData.customer_signature ?? '')}
                      </div>
                    )}
                  </div>
                )}
                {fullInterventionData.customer_comments && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-info">
                        {t('completed.comments')}
                      </div>
                      <div className="text-sm italic text-foreground">
                        &quot;{fullInterventionData.customer_comments}&quot;
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MaterialsSection({
  materials,
}: {
  materials: MaterialConsumption[];
}) {
  const { t } = useTranslation();
  if (materials.length === 0) return null;

  const totalCost = materials.reduce(
    (sum, material) => sum + (material.total_cost ?? 0),
    0,
  );

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-info" />
          {t('completed.materialsSection')}
        </CardTitle>
        <CardDescription>{t('completed.materialsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground" title={material.material_id}>
                  {material.material_id.slice(0, 8)}&hellip;{material.material_id.slice(-4)}
                </span>
                {material.batch_used && (
                  <span className="text-xs text-muted-foreground">{t('completed.batch')}: {material.batch_used}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {t('completed.quantity')}: <span className="font-semibold text-foreground">{material.quantity_used}</span>
                </span>
                {material.waste_quantity > 0 && (
                  <span className="text-warning">{t('completed.waste')}: {material.waste_quantity}</span>
                )}
                {material.total_cost != null && (
                  <span className="font-semibold text-info">
                    {material.total_cost.toFixed(2)} €
                  </span>
                )}
              </div>
            </div>
          ))}
          {materials.some((material) => material.total_cost != null) && (
            <div className="mt-3 flex justify-end border-t border-border pt-3">
              <span className="text-sm font-bold text-info">
                {t('completed.total')}: {totalCost.toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PhotoGallerySection({
  photoCount,
  allStepPhotoUrls,
  photosBefore,
  photosAfter,
  photosDuring,
  onSelectPhoto,
}: {
  photoCount: number;
  allStepPhotoUrls: string[];
  photosBefore?: unknown[];
  photosAfter?: unknown[];
  photosDuring?: unknown[];
  onSelectPhoto: (url: string) => void;
}) {
  const { t } = useTranslation();
  if (photoCount === 0 && allStepPhotoUrls.length === 0) return null;

  const photoEntries = [
    { label: t('completed.photoTotal'), value: allStepPhotoUrls.length || photoCount, color: 'info' },
    { label: t('completed.photoBefore'), value: photosBefore?.length || 0, color: 'success' },
    { label: t('completed.photoAfter'), value: photosAfter?.length || 0, color: 'purple' },
    { label: t('completed.photoDuring'), value: photosDuring?.length || 0, color: 'warning' },
  ] as const;

  const colorMap = {
    info: 'bg-info/5 border-info/20 text-info',
    success: 'bg-success/5 border-success/20 text-success',
    purple: 'bg-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400',
    warning: 'bg-warning/5 border-warning/20 text-warning',
  };

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-info" />
          {t('completed.photoGallery')}
        </CardTitle>
        <CardDescription>{t('completed.photoGalleryDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photoEntries.map((entry) => (
            <div key={entry.label} className={`rounded-xl border p-4 text-center ${colorMap[entry.color]}`}>
              <div className="mb-1 text-3xl font-bold">{entry.value}</div>
              <div className="text-xs font-semibold uppercase tracking-wider">
                {entry.label}
              </div>
            </div>
          ))}
        </div>

        {allStepPhotoUrls.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {allStepPhotoUrls.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => onSelectPhoto(resolveLocalImageUrl(url))}
                  className="aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Photo ${index + 1}`}
                >
                  <img
                    src={resolveLocalImageUrl(url)}
                    alt={`Photo ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AuditTrailSection({
  task,
  fullInterventionData,
}: {
  task: {
    id?: string;
    created_at?: string;
    updated_at?: string | number;
    synced?: boolean;
    last_synced_at?: string | null;
  };
  fullInterventionData?: {
    id?: string;
    created_at?: string | number | bigint;
    updated_at?: string | number | bigint;
  } | null;
}) {
  const { t } = useTranslation();
  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
          {t('completed.auditTrail')}
        </CardTitle>
        <CardDescription>{t('completed.auditTrailDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('completed.task')}
            </div>
            <div className="space-y-1 text-muted-foreground">
              <div><span className="font-medium">{t('completed.taskId')}:</span> {task.id?.slice(-8) || 'N/A'}</div>
              <div><span className="font-medium">{t('completed.created')}:</span> {task.created_at ? formatDateTime(task.created_at) : 'N/A'}</div>
              <div><span className="font-medium">{t('completed.updated')}:</span> {task.updated_at ? formatDateTime(task.updated_at) : 'N/A'}</div>
            </div>
          </div>
          {fullInterventionData && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('completed.intervention')}
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div><span className="font-medium">{t('completed.taskId')}:</span> {fullInterventionData.id?.slice(-8) || 'N/A'}</div>
                <div><span className="font-medium">{t('completed.created')}:</span> {formatDateTime(String(fullInterventionData.created_at || ''))}</div>
                <div><span className="font-medium">{t('completed.updated')}:</span> {formatDateTime(String(fullInterventionData.updated_at || ''))}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className={`h-2 w-2 rounded-full ${task.synced ? 'bg-success' : 'bg-warning'}`} />
          <span className="text-muted-foreground">
            {task.synced ? t('completed.synced') : t('completed.notSynced')}
          </span>
          {task.last_synced_at && (
            <span className="text-muted-foreground/60">
              · {t('completed.lastSync')}: {formatDateTime(task.last_synced_at)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SelectedPhotoOverlay({
  selectedPhoto,
  onClose,
}: {
  selectedPhoto: string | null;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!selectedPhoto) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, handleKeyDown]);

  if (!selectedPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Fermer"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={selectedPhoto}
        alt="Aperçu photo"
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
