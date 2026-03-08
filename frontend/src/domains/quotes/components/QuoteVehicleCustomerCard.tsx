'use client';

import { useState } from 'react';
import { Car, Users, X, Search, User, Building } from 'lucide-react';
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

interface QuoteVehicleCustomerCardProps {
  // Client — existing selection
  customerId: string;
  customers: CustomerOption[];
  onCustomerIdChange: (id: string) => void;
  // Client — inline creation fields
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientType: 'individual' | 'business';
  onClientNameChange: (v: string) => void;
  onClientEmailChange: (v: string) => void;
  onClientPhoneChange: (v: string) => void;
  onClientTypeChange: (v: 'individual' | 'business') => void;
  // Vehicle fields (sent inline on the quote)
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehiclePlate: string;
  vehicleVin: string;
  onVehicleMakeChange: (v: string) => void;
  onVehicleModelChange: (v: string) => void;
  onVehicleYearChange: (v: string) => void;
  onVehiclePlateChange: (v: string) => void;
  onVehicleVinChange: (v: string) => void;
}

export function QuoteVehicleCustomerCard({
  customerId,
  customers,
  onCustomerIdChange,
  clientName,
  clientEmail,
  clientPhone,
  clientType,
  onClientNameChange,
  onClientEmailChange,
  onClientPhoneChange,
  onClientTypeChange,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  vehiclePlate,
  vehicleVin,
  onVehicleMakeChange,
  onVehicleModelChange,
  onVehicleYearChange,
  onVehiclePlateChange,
  onVehicleVinChange,
}: QuoteVehicleCustomerCardProps) {
  const [clientMode, setClientMode] = useState<'create' | 'select'>('create');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleClearClient = () => {
    onCustomerIdChange('');
  };

  return (
    <div className="space-y-6">
      {/* Client Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            Client <span className="text-destructive">*</span>
          </Label>
          {!selectedCustomer && (
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setClientMode('create')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  clientMode === 'create'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Nouveau
              </button>
              <button
                type="button"
                onClick={() => setClientMode('select')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  clientMode === 'select'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Search className="h-3 w-3 inline mr-1" />
                Existant
              </button>
            </div>
          )}
        </div>

        {/* Selected client badge */}
        {selectedCustomer ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 border">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{selectedCustomer.name}</span>
              {selectedCustomer.company && (
                <span className="ml-1.5 text-muted-foreground text-xs">
                  {selectedCustomer.company}
                </span>
              )}
              {selectedCustomer.email && (
                <div className="text-xs text-muted-foreground truncate">
                  {selectedCustomer.email}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleClearClient}
              title="Changer de client"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : clientMode === 'create' ? (
          /* Inline client fields — created automatically on quote submit */
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-xs text-muted-foreground">
                Nom du client
              </Label>
              <Input
                id="clientName"
                placeholder="ex: Jean Dupont"
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="clientEmail"
                  placeholder="email@exemple.com"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => onClientEmailChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-xs text-muted-foreground">
                  Téléphone
                </Label>
                <Input
                  id="clientPhone"
                  placeholder="06 12 34 56 78"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => onClientPhoneChange(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="clientType"
                    value="individual"
                    checked={clientType === 'individual'}
                    onChange={(e) => onClientTypeChange(e.target.value as 'individual' | 'business')}
                    className="w-4 h-4 text-green-600 bg-background border-border focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Particulier</span>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="clientType"
                    value="business"
                    checked={clientType === 'business'}
                    onChange={(e) => onClientTypeChange(e.target.value as 'individual' | 'business')}
                    className="w-4 h-4 text-green-600 bg-background border-border focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Entreprise</span>
                  </div>
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Le client sera créé automatiquement à la soumission du devis.
            </p>
          </div>
        ) : (
          /* Select existing client */
          <Select
            value={customerId || 'none'}
            onValueChange={(v) => onCustomerIdChange(v === 'none' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucun —</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company && ` (${c.company})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Vehicle Section */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Car className="h-4 w-4 text-muted-foreground" />
          Véhicule{' '}
          <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="vehicleMake" className="text-xs text-muted-foreground">
              Marque
            </Label>
            <Input
              id="vehicleMake"
              placeholder="ex: Toyota"
              value={vehicleMake}
              onChange={(e) => onVehicleMakeChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleModel" className="text-xs text-muted-foreground">
              Modèle
            </Label>
            <Input
              id="vehicleModel"
              placeholder="ex: Yaris"
              value={vehicleModel}
              onChange={(e) => onVehicleModelChange(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="vehicleYear" className="text-xs text-muted-foreground">
              Année
            </Label>
            <Input
              id="vehicleYear"
              placeholder="ex: 2022"
              value={vehicleYear}
              maxLength={4}
              onChange={(e) => onVehicleYearChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehiclePlate" className="text-xs text-muted-foreground">
              Immatriculation
            </Label>
            <Input
              id="vehiclePlate"
              placeholder="ex: AB-123-CD"
              value={vehiclePlate}
              onChange={(e) => onVehiclePlateChange(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleVin" className="text-xs text-muted-foreground">
            N° VIN (châssis)
          </Label>
          <Input
            id="vehicleVin"
            placeholder="Numéro de châssis"
            value={vehicleVin}
            onChange={(e) => onVehicleVinChange(e.target.value.toUpperCase())}
          />
        </div>
      </div>
    </div>
  );
}
