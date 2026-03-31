import React from 'react';
import { Car, Info } from 'lucide-react';
import { getPpfZoneLabel } from '@/lib/i18n/status-labels';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskWithDetails } from '@/types/task.types';

interface VehicleInfoCardProps {
  task: TaskWithDetails;
}

export function VehicleInfoCard({ task }: VehicleInfoCardProps) {
  const vehicleInfo = [
    {
      label: 'Plaque',
      value: task.vehicle_plate || 'Non définie',
      icon: <Car className="mr-2 h-5 w-5 text-blue-500" />,
    },
    {
      label: 'Modèle',
      value: task.vehicle_model || 'Non défini',
      icon: <Car className="h-5 w-5 text-blue-600" />,
    },
    {
      label: 'Marque',
      value: task.vehicle_make || 'Non définie',
      icon: <Info className="mr-1 h-3 w-3 text-gray-400" />,
    },
    {
      label: 'Année',
      value: task.vehicle_year || 'Non définie',
      icon: <Info className="mr-1 h-3 w-3 text-gray-400" />,
    },
    {
      label: 'VIN',
      value: task.vin || 'Non disponible',
      icon: <Info className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Car className="mr-2 h-5 w-5 text-blue-500" />
          Informations véhicule
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {vehicleInfo.map((info, index) => (
            <div key={index} className="flex items-center space-x-3">
              {info.icon}
              <div>
                <p className="text-sm text-gray-500">{info.label}</p>
                <p className="text-sm font-medium">{info.value}</p>
              </div>
            </div>
          ))}
        </div>

        {task.ppf_zones && task.ppf_zones.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Zones PPF</span>
              <Badge variant="secondary" className="text-xs">
                {task.ppf_zones.map((zone) => getPpfZoneLabel(zone)).join(', ')}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
