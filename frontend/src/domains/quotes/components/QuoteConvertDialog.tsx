'use client';

import { useState, useCallback, useMemo } from 'react';
import { useConvertQuoteToTask } from '../hooks/useQuotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowRight, Loader2, Car, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { PPF_ZONES } from '@/domains/tasks';

export interface VehicleInfo {
  plate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  scheduledDate?: string;
  ppfZones?: string[];
}

export interface QuoteConvertDialogProps {
  quoteId: string;
  quoteNumber: string;
  initialVehicleInfo: VehicleInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (taskId: string) => void;
}

export function QuoteConvertDialog({
  quoteId,
  quoteNumber,
  initialVehicleInfo,
  open,
  onOpenChange,
  onSuccess,
}: QuoteConvertDialogProps) {
  const { convertQuoteToTask, loading } = useConvertQuoteToTask();
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    ...initialVehicleInfo,
    ppfZones: initialVehicleInfo.ppfZones || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleInfo, string>>>({});

  const handleFieldChange = useCallback((field: keyof VehicleInfo, value: unknown) => {
    setVehicleInfo(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const handleZoneToggle = useCallback((zoneId: string) => {
    setVehicleInfo(prev => {
      const currentZones = prev.ppfZones || [];
      const newZones = currentZones.includes(zoneId)
        ? currentZones.filter(z => z !== zoneId)
        : [...currentZones, zoneId];
      return { ...prev, ppfZones: newZones };
    });
    setErrors(prev => ({ ...prev, ppfZones: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof VehicleInfo, string>> = {};

    if (!vehicleInfo.plate.trim()) {
      newErrors.plate = 'La plaque est requise';
    }

    if (!vehicleInfo.ppfZones || vehicleInfo.ppfZones.length === 0) {
      newErrors.ppfZones = 'Au moins une zone PPF est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [vehicleInfo.plate, vehicleInfo.ppfZones]);

  const handleConvert = useCallback(async () => {
    if (!validate()) return;

    try {
      const result = await convertQuoteToTask(quoteId, vehicleInfo);

      if (result) {
        toast.success(`Tâche créée: ${result.task_number}`);
        onSuccess?.(result.task_id);
        onOpenChange(false);
      }
    } catch {
      // Error is handled by the hook
    }
  }, [quoteId, vehicleInfo, validate, convertQuoteToTask, onSuccess, onOpenChange]);

  const sortedZones = useMemo(() => {
    // Group by category if possible, or just return as-is
    return PPF_ZONES;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Convertir le devis en tâche
          </DialogTitle>
          <DialogDescription>
            Créer une nouvelle tâche à partir du devis <strong>{quoteNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-1">
          <div className="space-y-4 py-4 pr-3">
            {/* Vehicle Information */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Car className="h-4 w-4" />
                Informations véhicule
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="plate">Plaque *</Label>
                  <Input
                    id="plate"
                    value={vehicleInfo.plate}
                    onChange={e => handleFieldChange('plate', e.target.value)}
                    placeholder="AB-123-CD"
                    className={errors.plate ? 'border-red-500' : ''}
                  />
                  {errors.plate && (
                    <p className="text-xs text-red-500">{errors.plate}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    value={vehicleInfo.year}
                    onChange={e => handleFieldChange('year', e.target.value)}
                    placeholder="2024"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="make">Marque</Label>
                  <Input
                    id="make"
                    value={vehicleInfo.make}
                    onChange={e => handleFieldChange('make', e.target.value)}
                    placeholder="Peugeot"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="model">Modèle</Label>
                  <Input
                    id="model"
                    value={vehicleInfo.model}
                    onChange={e => handleFieldChange('model', e.target.value)}
                    placeholder="308"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={vehicleInfo.vin}
                    onChange={e => handleFieldChange('vin', e.target.value)}
                    placeholder="VF3..."
                  />
                </div>
              </div>
            </div>

            {/* PPF Zones Selection */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4" />
                Zones PPF *
              </h3>

              <div className="grid grid-cols-1 gap-y-2">
                {sortedZones.map(zone => (
                  <div key={zone.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`zone-${zone.id}`}
                      checked={vehicleInfo.ppfZones?.includes(zone.id)}
                      onCheckedChange={() => handleZoneToggle(zone.id)}
                    />
                    <Label 
                      htmlFor={`zone-${zone.id}`}
                      className="text-sm cursor-pointer font-normal"
                    >
                      {zone.name}
                    </Label>
                  </div>
                ))}
              </div>

              {errors.ppfZones && (
                <p className="text-xs text-red-500 mt-1">{errors.ppfZones}</p>
              )}
            </div>

            {/* Scheduling (Optional) */}
            <div className="space-y-2 px-1">
              <Label htmlFor="scheduledDate">Date prévue (optionnel)</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={vehicleInfo.scheduledDate || ''}
                onChange={e => handleFieldChange('scheduledDate', e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConvert}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convertir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
