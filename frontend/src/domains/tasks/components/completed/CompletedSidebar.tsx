import React from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Shield,
  Thermometer,
  Droplets,
  Clock,
  Badge,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { Badge as UIBadge } from '@/shared/ui/ui/badge';
import { cn } from '@/lib/utils';

type CompletedSidebarProps = {
  task: {
    id?: string;
    task_number?: string;
    external_id?: string | null;
    priority?: string;
    lot_film?: string | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    vehicle_year?: string | null;
    vin?: string;
    ppf_zones?: string[];
    custom_ppf_zones?: string[];
    start_time?: string | null;
    end_time?: string | null;
  };
  customer: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  intervention: {
    temperature_celsius?: number | null;
    humidity_percentage?: number | null;
  };
  workflowProgress: number;
};

export function CompletedSidebar({
  task,
  customer,
  intervention,
  workflowProgress,
}: CompletedSidebarProps) {
  const vehicleDisplay = [task.vehicle_make, task.vehicle_model, task.vehicle_year]
    .filter(Boolean)
    .join(' ');

  const calculateDuration = () => {
    if (!task.start_time || !task.end_time) return null;
    const start = new Date(task.start_time);
    const end = new Date(task.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMins}min`;
  };

  const duration = calculateDuration();

  return (
    <div className="space-y-4">
      {/* Task Status Card */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Statut
          </span>
          <CheckCircle className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
            <span>Progression</span>
            <span className="font-bold">{workflowProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-emerald-200">
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${workflowProgress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">ID Tâche</span>
            <span className="font-mono">{task.id?.slice(-8) || '—'}</span>
          </div>
          {task.task_number && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">N° Tâche</span>
              <span className="font-medium">{task.task_number}</span>
            </div>
          )}
          {task.external_id && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">ID Externe</span>
              <span className="font-medium">{task.external_id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <Car className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
            Véhicule
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-base font-bold text-gray-900">{vehicleDisplay || '—'}</div>
          </div>

          {task.vin && (
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <Shield className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-gray-500">VIN</div>
                <div className="font-mono text-gray-900">{task.vin}</div>
              </div>
            </div>
          )}

          {task.lot_film && (
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500">Lot Film</span>
              <span className="text-sm font-medium text-gray-900">{task.lot_film}</span>
            </div>
          )}

          {task.ppf_zones && task.ppf_zones.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Zones PPF</div>
              <div className="flex flex-wrap gap-1">
                {task.ppf_zones.slice(0, 5).map((zone, index) => (
                  <UIBadge
                    key={index}
                    variant="secondary"
                    className="text-[10px] font-normal"
                  >
                    {zone}
                  </UIBadge>
                ))}
                {task.ppf_zones.length > 5 && (
                  <UIBadge
                    variant="outline"
                    className="text-[10px] font-normal"
                  >
                    +{task.ppf_zones.length - 5}
                  </UIBadge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <User className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
            Client
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="font-semibold text-gray-900">{customer.name || '—'}</div>

          {customer.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate">{customer.phone}</span>
            </div>
          )}

          {customer.address && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{customer.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Environmental Conditions */}
      {(intervention.temperature_celsius !== null || intervention.humidity_percentage !== null) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
              <Thermometer className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Conditions
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {intervention.temperature_celsius !== null && (
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {intervention.temperature_celsius}°C
                </div>
                <div className="text-[10px] uppercase tracking-wider text-red-500 mt-1">
                  Température
                </div>
              </div>
            )}

            {intervention.humidity_percentage !== null && (
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {intervention.humidity_percentage}%
                </div>
                <div className="text-[10px] uppercase tracking-wider text-blue-500 mt-1">
                  Humidité
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timing Information */}
      {duration && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Durée
            </span>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{duration}</div>
            <div className="text-xs text-gray-500 mt-1">Temps total</div>
          </div>
        </div>
      )}

      {/* Priority Badge */}
      {task.priority && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
              <Badge className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Priorité
            </span>
          </div>

          <UIBadge
            variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
            className="w-full justify-center"
          >
            {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
          </UIBadge>
        </div>
      )}
    </div>
  );
}
