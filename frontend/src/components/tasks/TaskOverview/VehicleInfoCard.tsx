import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Info } from 'lucide-react';
import { TaskWithDetails } from '@/types/task.types';

interface VehicleInfoCardProps {
  task: TaskWithDetails;
}

export function VehicleInfoCard({ task }: VehicleInfoCardProps) {
  const vehicleInfo = [
    {
      label: 'Plaque',
      value: task.vehicle_plate || 'Non définie',
      icon: <Car className="h-5 w-5 text-blue-500 mr-2" />,
    },
    {
      label: 'Modèle',
      value: task.vehicle_model || 'Non défini',
      icon: <Car className="h-5 w-5 text-blue-600" />,
    },
    {
      label: 'Marque',
      value: task.vehicle_make || 'Non définie',
      icon: <Info className="h-3 w-3 mr-1 text-gray-400" />,
    },
    {
      label: 'Année',
      value: task.vehicle_year || 'Non définie',
      icon: <Info className="h-3 w-3 mr-1 text-gray-400" />,
    },
    {
      label: 'VIN',
      value: task.vin || 'Non disponible',
      icon: <Info className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Car className="h-5 w-5 text-blue-500 mr-2" />
          Informations Véhicule
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* PPF Zone */}
        {task.ppf_zones && task.ppf_zones.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Zone PPF</span>
              <Badge variant="secondary" className="text-xs">
                {task.ppf_zones.join(', ')}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}