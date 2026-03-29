"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Car, Info, CheckCircle, AlertCircle, Hash } from "lucide-react";
import { FormStepProps } from "../types";
import {
  FieldError,
  FieldStatusIcon,
  focusFirstInvalidField,
  getInputClassName,
} from "./stepFieldShared";
import {
  formatLicensePlate,
  getFilteredMakes,
  getVinInputClass,
  sanitizeVin,
  validateVIN,
  type VinValidationState,
} from "./vehicleStep.helpers";

export const VehicleStep: React.FC<FormStepProps> = ({
  formData,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const [makeFilter, setMakeFilter] = useState("");
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [vinValidationState, setVinValidationState] = useState<VinValidationState>(null);

  // Memoized filtered makes for better performance
  const filteredMakes = useMemo(() => getFilteredMakes(makeFilter), [makeFilter]);

  // Debounced VIN validation effect
  useEffect(() => {
    if (!formData.vehicle_vin) {
      setVinValidationState(null);
      return;
    }

    setVinValidationState("checking");

    const timer = setTimeout(() => {
      const isValid = validateVIN(formData.vehicle_vin || "");
      setVinValidationState(isValid ? "valid" : "invalid");
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.vehicle_vin]);

  // Focus on the first field with error
  useEffect(() => {
    focusFirstInvalidField(errors);
  }, [errors]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      onChange({ [name]: value });
    },
    [onChange],
  );

  const handleMakeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMakeFilter(value);
      onChange({ vehicle_make: value });
      setShowMakeDropdown(value.length > 0);
    },
    [onChange],
  );

  const selectMake = useCallback(
    (make: string) => {
      onChange({ vehicle_make: make });
      setMakeFilter(make);
      setShowMakeDropdown(false);
    },
    [onChange],
  );

  const handlePlateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ vehicle_plate: formatLicensePlate(e.target.value) });
    },
    [onChange],
  );

  const handleVINChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ vehicle_vin: sanitizeVin(e.target.value) });
    },
    [onChange],
  );

  const getFieldStatus = useCallback(
    (fieldName: string) => {
      if (errors[fieldName]) return "error";
      if (formData[fieldName as keyof typeof formData]) return "success";
      return "default";
    },
    [errors, formData],
  );

  const renderFieldIcon = useCallback(
    (fieldName: string) => {
      const status = getFieldStatus(fieldName);
      if (status === "error") {
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      } else if (status === "success") {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      }
      return null;
    },
    [getFieldStatus],
  );

  const getVINStatusIcon = useCallback(() => {
    if (vinValidationState === "checking") {
      return (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      );
    } else if (vinValidationState === "valid") {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (vinValidationState === "invalid") {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  }, [vinValidationState]);

  const getVINStatusColor = useCallback(() => {
    return getVinInputClass(vinValidationState);
  }, [vinValidationState]);

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      <div className="bg-muted rounded-lg border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-[hsl(var(--rpma-surface))] p-3 sm:p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <Car className="w-5 h-5 text-[hsl(var(--rpma-teal))] mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Informations du véhicule
              </h3>
            </div>
            <div className="text-xs sm:text-sm bg-[hsl(var(--rpma-teal))]/10 px-2 sm:px-3 py-1 rounded-full">
              <span className="font-medium text-[hsl(var(--rpma-teal))]">N°:</span>
              <span className="text-muted-foreground ml-1">
                {formData.title || "Auto-généré"}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Saisissez les informations du véhicule Ï  traiter
          </p>
        </div>

        {/* Form Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* License Plate - Full width, most important field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Plaque d&apos;immatriculation *
            </label>
            <div className="relative">
              <input
                type="text"
                name="vehicle_plate"
                value={formData.vehicle_plate || ""}
                onChange={handlePlateChange}
                placeholder="AB-123-CD"
                maxLength={9}
                className={getInputClassName(
                  "w-full border rounded-lg bg-white px-3 py-2 text-center font-mono text-base tracking-wider text-foreground placeholder-muted-foreground transition-all duration-200 sm:px-4 sm:py-3 sm:text-lg",
                  errors.vehicle_plate ? "error" : formData.vehicle_plate ? "success" : "default",
                  "border-border focus:border-border-light focus:ring-border-light/50",
                )}
                disabled={isLoading}
                required
                aria-describedby={
                  errors.vehicle_plate ? "plate-error" : undefined
                }
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <FieldStatusIcon status={errors.vehicle_plate ? "error" : formData.vehicle_plate ? "success" : "default"} />
              </div>
            </div>
            <FieldError id="plate-error" message={errors.vehicle_plate} />
          </div>

          {/* Make and Model - Side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Vehicle Make with autocomplete */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Marque *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="vehicle_make"
                  value={formData.vehicle_make || ""}
                  onChange={handleMakeChange}
                  onFocus={() => setShowMakeDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowMakeDropdown(false), 200)
                  }
                  placeholder="Ex: BMW, Mercedes, Audi..."
                  className={getInputClassName(
                    "w-full rounded-lg border bg-white px-3 py-2 text-foreground placeholder-muted-foreground transition-all duration-200",
                    errors.vehicle_make ? "error" : formData.vehicle_make ? "success" : "default",
                    "border-border focus:border-border-light focus:ring-border-light/50",
                  )}
                  disabled={isLoading}
                  required
                  aria-describedby={
                    errors.vehicle_make ? "make-error" : undefined
                  }
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <FieldStatusIcon status={errors.vehicle_make ? "error" : formData.vehicle_make ? "success" : "default"} />
                </div>

                {/* Enhanced Autocomplete Dropdown */}
                {showMakeDropdown && filteredMakes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-muted border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMakes.map((make) => (
                      <button
                        key={make}
                        type="button"
                        className="w-full px-3 py-2 text-left text-foreground hover:bg-[hsl(var(--rpma-teal))]/10 hover:text-[hsl(var(--rpma-teal))] transition-colors focus:bg-[hsl(var(--rpma-teal))]/10 focus:text-[hsl(var(--rpma-teal))] focus:outline-none"
                        onClick={() => selectMake(make)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectMake(make);
                          }
                        }}
                      >
                        {make}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <FieldError id="make-error" message={errors.vehicle_make} />
            </div>

            {/* Vehicle Model */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Modèle *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="vehicle_model"
                  value={formData.vehicle_model || ""}
                  onChange={handleChange}
                  placeholder="Ex: Série 3, Classe C, A4..."
                  className={getInputClassName(
                    "w-full rounded-lg border bg-white px-3 py-2 text-foreground placeholder-muted-foreground transition-all duration-200",
                    errors.vehicle_model ? "error" : formData.vehicle_model ? "success" : "default",
                    "border-border focus:border-border-light focus:ring-border-light/50",
                  )}
                  disabled={isLoading}
                  required
                  aria-describedby={
                    errors.vehicle_model ? "model-error" : undefined
                  }
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <FieldStatusIcon status={errors.vehicle_model ? "error" : formData.vehicle_model ? "success" : "default"} />
                </div>
              </div>
              <FieldError id="model-error" message={errors.vehicle_model} />
            </div>
          </div>

          {/* Year and VIN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Year */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Année *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="vehicle_year"
                  value={formData.vehicle_year || ""}
                  onChange={handleChange}
                  placeholder="2023"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className={`
                    w-full px-3 py-2 border rounded-lg transition-all duration-200 bg-white text-foreground placeholder-muted-foreground
                    ${
                      errors.vehicle_year
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                        : formData.vehicle_year
                          ? "border-[hsl(var(--rpma-teal))] focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20"
                          : "border-border focus:border-border-light focus:ring-border-light/50"
                    }
                    focus:ring-2 focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  disabled={isLoading}
                  required
                  aria-describedby={
                    errors.vehicle_year ? "year-error" : undefined
                  }
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {renderFieldIcon("vehicle_year")}
                </div>
              </div>
              {errors.vehicle_year && (
                <p
                  id="year-error"
                  className="text-sm text-red-400 flex items-center mt-1"
                >
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {errors.vehicle_year}
                </p>
              )}
            </div>

            {/* Enhanced VIN Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                <Hash className="w-4 h-4 inline mr-1" />
                VIN (optionnel)
                <span className="text-xs text-muted-foreground ml-1">
                  17 caractères
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="vehicle_vin"
                  value={formData.vehicle_vin || ""}
                  onChange={handleVINChange}
                  placeholder="1HGBH41JXMN109186"
                  maxLength={17}
                  className={`
                    w-full px-3 py-2 border rounded-lg font-mono text-sm transition-all duration-200 text-foreground placeholder-muted-foreground
                    ${getVINStatusColor()}
                    focus:ring-2 focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  disabled={isLoading}
                  aria-describedby={
                    errors.vehicle_vin ? "vin-error" : "vin-help"
                  }
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getVINStatusIcon()}
                </div>
              </div>

              {/* VIN Help Text */}
              <div
                id="vin-help"
                className="text-xs text-muted-foreground space-y-1"
              >
                {formData.vehicle_vin && (
                  <div className="flex items-center space-x-2">
                    {vinValidationState === "checking" && (
                      <span className="text-[hsl(var(--rpma-teal))]">
                        Vérification en cours...
                      </span>
                    )}
                    {vinValidationState === "valid" && (
                      <span className="text-[hsl(var(--rpma-teal))] flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        VIN valide
                      </span>
                    )}
                    {vinValidationState === "invalid" && (
                      <span className="text-red-400 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        VIN invalide
                      </span>
                    )}
                  </div>
                )}
                <p>Format: 17 caractères (A-Z, 0-9, sans I, O, Q)</p>
              </div>

              {errors.vehicle_vin && (
                <p
                  id="vin-error"
                  className="text-sm text-red-400 flex items-center mt-1"
                >
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {errors.vehicle_vin}
                </p>
              )}
            </div>
          </div>

          {/* Enhanced Info Box */}
          <div className="bg-[hsl(var(--rpma-teal))]/10 border border-[hsl(var(--rpma-teal))]/30 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-[hsl(var(--rpma-teal))] mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Conseils de saisie :</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• La plaque sera automatiquement formatée (AB-123-CD)</li>
                  <li>
                    • Le VIN est optionnel mais aide Ï  l&apos;identification
                    précise
                  </li>
                  <li>
                    • Utilisez la suggestion de marques pour éviter les erreurs
                  </li>
                  <li>
                    • Le VIN est validé en temps réel avec vérification de
                    checksum
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
