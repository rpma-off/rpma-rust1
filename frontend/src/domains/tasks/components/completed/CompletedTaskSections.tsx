'use client';

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
  if (checklistItems.length === 0) return null;

  return (
    <Card className="rounded-xl border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckSquare className="h-5 w-5 text-emerald-600" />
          Checklist
        </CardTitle>
        <CardDescription>
          {checklistCount}/{checklistTotal} éléments complétés
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-100">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-2.5">
              <CheckCircle
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${item.is_completed ? 'text-emerald-500' : 'text-gray-300'}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {item.description}
                </p>
                {item.completed_at && (
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {formatDateTime(item.completed_at)}
                  </p>
                )}
                {item.notes && (
                  <p className="mt-0.5 text-xs italic text-gray-500">{item.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
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
  if (!fullInterventionData) return null;

  return (
    <Card className="rounded-xl border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-amber-600" />
          Qualité & Satisfaction
        </CardTitle>
        <CardDescription>Évaluation client et scores de qualité</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(fullInterventionData.customer_satisfaction !== null ||
          fullInterventionData.quality_score !== null) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fullInterventionData.customer_satisfaction !== null && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Satisfaction Client
                  </div>
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mb-2 text-3xl font-extrabold text-amber-600">
                  {fullInterventionData.customer_satisfaction}/5
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, index) => (
                    <span
                      key={index}
                      className={`text-lg ${index < fullInterventionData.customer_satisfaction! ? 'text-amber-500' : 'text-amber-200'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}

            {fullInterventionData.quality_score !== null && (
              <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                    Score Qualité
                  </div>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <div className="mb-2 text-3xl font-extrabold text-purple-600">
                  {fullInterventionData.quality_score}%
                </div>
                <div className="h-2 w-full rounded-full bg-purple-200">
                  <div
                    className="h-2 rounded-full bg-purple-600 transition-all duration-500"
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
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Observations Finales
              </div>
              <div className="space-y-2">
                {fullInterventionData.final_observations.map((observation, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="text-sm text-gray-700">{observation}</span>
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
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Signature className="h-4 w-4 text-blue-600" />
                Signature & Commentaires Client
              </div>
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                {Boolean(fullInterventionData.customer_signature) && (
                  <div className="mb-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Signataire
                    </div>
                    <div className="text-sm font-medium text-blue-900">
                      {String(fullInterventionData.customer_signature ?? '')}
                    </div>
                  </div>
                )}
                {fullInterventionData.customer_comments && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Commentaires
                      </div>
                      <div className="text-sm italic text-blue-900">
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
  if (materials.length === 0) return null;

  const totalCost = materials.reduce(
    (sum, material) => sum + (material.total_cost ?? 0),
    0,
  );

  return (
    <Card className="rounded-xl border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-indigo-600" />
          Matériaux Utilisés
        </CardTitle>
        <CardDescription>Consommation de matériaux durant l&apos;intervention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-600" title={material.material_id}>
                  {material.material_id.slice(0, 8)}&hellip;{material.material_id.slice(-4)}
                </span>
                {material.batch_used && (
                  <span className="text-xs text-gray-500">Lot: {material.batch_used}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>
                  Qté: <span className="font-semibold text-gray-900">{material.quantity_used}</span>
                </span>
                {material.waste_quantity > 0 && (
                  <span className="text-amber-600">Déchet: {material.waste_quantity}</span>
                )}
                {material.total_cost != null && (
                  <span className="font-semibold text-indigo-700">
                    {material.total_cost.toFixed(2)} €
                  </span>
                )}
              </div>
            </div>
          ))}
          {materials.some((material) => material.total_cost != null) && (
            <div className="mt-3 flex justify-end border-t border-gray-200 pt-3">
              <span className="text-sm font-extrabold text-indigo-700">
                Total: {totalCost.toFixed(2)} €
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
  if (photoCount === 0 && allStepPhotoUrls.length === 0) return null;

  return (
    <Card className="rounded-xl border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-cyan-600" />
          Galerie Photos
        </CardTitle>
        <CardDescription>Photos documentées pendant l&apos;intervention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Total', value: allStepPhotoUrls.length || photoCount, classes: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600 text-blue-700' },
            { label: 'Avant', value: photosBefore?.length || 0, classes: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600 text-emerald-700' },
            { label: 'Après', value: photosAfter?.length || 0, classes: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600 text-purple-700' },
            { label: 'Pendant', value: photosDuring?.length || 0, classes: 'from-amber-50 to-amber-100 border-amber-200 text-amber-600 text-amber-700' },
          ].map((entry) => {
            const [gradientClasses, borderClass, valueClass, labelClass] = entry.classes.split(' ');
            return (
              <div key={entry.label} className={`rounded-xl border ${borderClass} bg-gradient-to-br ${gradientClasses} p-4 text-center`}>
                <div className={`mb-1 text-3xl font-extrabold ${valueClass}`}>{entry.value}</div>
                <div className={`text-xs font-semibold uppercase tracking-wider ${labelClass}`}>
                  {entry.label}
                </div>
              </div>
            );
          })}
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
                  className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
  return (
    <Card className="rounded-xl border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-gray-600" />
          Audit Trail
        </CardTitle>
        <CardDescription>Informations système et historique</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tâche
            </div>
            <div className="space-y-1 text-gray-700">
              <div><span className="font-medium">ID:</span> {task.id?.slice(-8) || 'N/A'}</div>
              <div><span className="font-medium">Créé:</span> {task.created_at ? formatDateTime(task.created_at) : 'N/A'}</div>
              <div><span className="font-medium">Modifié:</span> {task.updated_at ? formatDateTime(task.updated_at) : 'N/A'}</div>
            </div>
          </div>
          {fullInterventionData && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Intervention
              </div>
              <div className="space-y-1 text-gray-700">
                <div><span className="font-medium">ID:</span> {fullInterventionData.id?.slice(-8) || 'N/A'}</div>
                <div><span className="font-medium">Créé:</span> {formatDateTime(String(fullInterventionData.created_at || ''))}</div>
                <div><span className="font-medium">Modifié:</span> {formatDateTime(String(fullInterventionData.updated_at || ''))}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className={`h-2 w-2 rounded-full ${task.synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-gray-700">
            {task.synced ? 'Synchronisé' : 'Non synchronisé'}
          </span>
          {task.last_synced_at && (
            <span className="text-gray-500">
              · Dernière sync: {formatDateTime(task.last_synced_at)}
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
  if (!selectedPhoto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
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
