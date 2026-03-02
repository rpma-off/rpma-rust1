'use client';

import Link from 'next/link';
import { Car, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  customerId: string | null;
  customerName: string | null;
}

interface QuoteVehicleCustomerCardProps {
  customerId: string;
  vehicleId: string;
  customers: CustomerOption[];
  vehicles: VehicleOption[];
  onCustomerIdChange: (id: string) => void;
  onVehicleIdChange: (id: string) => void;
}

export function QuoteVehicleCustomerCard({
  customerId,
  vehicleId,
  customers,
  vehicles,
  onCustomerIdChange,
  onVehicleIdChange,
}: QuoteVehicleCustomerCardProps) {
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleVehicleChange = (v: string) => {
    const vid = v === 'none' ? '' : v;
    onVehicleIdChange(vid);
    if (vid) {
      const vehicle = vehicles.find((veh) => veh.id === vid);
      if (vehicle?.customerId) {
        onCustomerIdChange(vehicle.customerId);
      }
    }
  };

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <h3 className="text-sm font-semibold">Véhicule & Client</h3>

      {/* Vehicle */}
      <div className="space-y-1">
        <Label className="text-xs">Véhicule</Label>
        <Select value={vehicleId || 'none'} onValueChange={handleVehicleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un véhicule" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
                {v.licensePlate && ` (${v.licensePlate})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle display */}
      {selectedVehicle && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Link
            href={`/vehicles/${selectedVehicle.id}`}
            target="_blank"
            className="min-w-0 flex-1 text-sm hover:underline"
          >
            <span className="font-medium">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </span>
            {selectedVehicle.licensePlate && (
              <span className="ml-1.5 text-muted-foreground">
                {selectedVehicle.licensePlate}
              </span>
            )}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onVehicleIdChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Customer */}
      <div className="space-y-1">
        <Label className="text-xs">Client</Label>
        <Select
          value={customerId || 'none'}
          onValueChange={(v) => onCustomerIdChange(v === 'none' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.company && ` (${c.company})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer display */}
      {selectedCustomer && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Link
            href={`/clients/${selectedCustomer.id}`}
            target="_blank"
            className="min-w-0 flex-1 text-sm hover:underline"
          >
            <span className="font-medium">{selectedCustomer.name}</span>
            {selectedCustomer.company && (
              <span className="ml-1.5 text-muted-foreground">
                {selectedCustomer.company}
              </span>
            )}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onCustomerIdChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
