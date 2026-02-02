"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shield,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Hash,
  Search,
} from "lucide-react";
import { FormStepProps, PPF_ZONES } from "../types";

export const PPFStep: React.FC<FormStepProps> = ({
  formData,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const [customZoneInput, setCustomZoneInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Focus on error fields
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        (element as HTMLElement).focus();
      }
    }
  }, [errors]);

  // Filter zones based on category and search
  const filteredZones = PPF_ZONES.filter((zone) => {
    const matchesCategory =
      selectedCategory === "all" || zone.category === selectedCategory;
    const matchesSearch = zone.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = [
    { id: "all", name: "Toutes les zones", count: PPF_ZONES.length },
    ...Array.from(new Set(PPF_ZONES.map((zone) => zone.category))).map(
      (category) => ({
        id: category!,
        name: getCategoryDisplayName(category!),
        count: PPF_ZONES.filter((zone) => zone.category === category).length,
      }),
    ),
  ];

  function getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      front: "Avant",
      rear: "Arrière",
      side: "Côtés",
      roof: "Toit",
      full: "Complet",
    };
    return categoryNames[category] || category;
  }

  const isZoneSelected = (zoneId: string) => {
    return formData.ppf_zones?.includes(zoneId) || false;
  };

  const toggleZone = (zoneId: string) => {
    const currentZones = formData.ppf_zones || [];
    const newZones = currentZones.includes(zoneId)
      ? currentZones.filter((id) => id !== zoneId)
      : [...currentZones, zoneId];

    onChange({ ppf_zones: newZones });
  };

  const addCustomZone = () => {
    if (!customZoneInput.trim()) return;

    // Check if zone already exists
    const allZones = [
      ...PPF_ZONES.map((zone) => zone.name.toLowerCase()),
      ...(formData.custom_ppf_zones || []).map((zone) => zone.toLowerCase()),
    ];

    if (allZones.includes(customZoneInput.toLowerCase().trim())) {
      toast.error("Cette zone existe déjà");
      return;
    }

    // Limit custom zones
    if ((formData.custom_ppf_zones?.length || 0) >= 10) {
      toast.error("Vous ne pouvez pas ajouter plus de 10 zones personnalisées");
      return;
    }

    const newCustomZones = [
      ...(formData.custom_ppf_zones || []),
      customZoneInput.trim(),
    ];
    onChange({ custom_ppf_zones: newCustomZones });
    setCustomZoneInput("");
  };

  const removeCustomZone = (zoneToRemove: string) => {
    const newCustomZones = (formData.custom_ppf_zones || []).filter(
      (zone) => zone !== zoneToRemove,
    );
    onChange({ custom_ppf_zones: newCustomZones });
  };

  const getTotalSelectedZones = () => {
    return (
      (formData.ppf_zones?.length || 0) +
      (formData.custom_ppf_zones?.length || 0)
    );
  };

  const getZoneCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      front: "bg-accent/20 text-accent border-accent/30",
      rear: "bg-red-500/20 text-red-400 border-red-500/30",
      side: "bg-accent/20 text-accent border-accent/30",
      roof: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      full: "bg-accent/20 text-accent border-accent/30",
    };
    return (
      colors[category] ||
      "bg-border text-foreground border-border"
    );
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="bg-muted rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent/20 to-accent/10 p-3 sm:p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-accent mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Zones de protection PPF
              </h3>
            </div>
            <div className="text-xs sm:text-sm bg-accent/20 px-2 sm:px-3 py-1 rounded-full">
              <span className="font-medium text-accent">
                {getTotalSelectedZones()} zone
                {getTotalSelectedZones() !== 1 ? "s" : ""} sélectionnée
                {getTotalSelectedZones() !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-border-light mt-1">
            Sélectionnez les zones du véhicule qui recevront le film de
            protection
          </p>
        </div>

        {/* Form Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-border-light" />
                <input
                  type="text"
                  placeholder="Rechercher une zone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border bg-black-light text-foreground placeholder-border-light rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                    ${
                      selectedCategory === category.id
                        ? "bg-accent text-foreground border-accent"
                        : "bg-black-light text-foreground border-border hover:bg-border"
                    }
                  `}
                >
                  {category.name} ({category.count})
                </button>
              ))}
            </div>
          </div>

          {/* Zone Selection Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {filteredZones.map((zone) => {
              const isSelected = isZoneSelected(zone.id);
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => toggleZone(zone.id)}
                  disabled={isLoading}
                  className={`
                    relative p-3 border-2 rounded-lg text-left transition-all duration-200
                    transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/50
                    ${
                      isSelected
                        ? "border-accent bg-black-light text-foreground"
                        : "border-border bg-black-light text-foreground hover:border-accent/50 hover:bg-border"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{zone.name}</h4>
                      {zone.description && (
                        <p className="text-xs text-border-light mt-1">
                          {zone.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {/* Category Badge */}
                  <div
                    className={`
                    mt-2 inline-block px-2 py-1 text-xs font-medium rounded border
                    ${getZoneCategoryColor(zone.category!)}
                  `}
                  >
                    {getCategoryDisplayName(zone.category!)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* No results message */}
          {filteredZones.length === 0 && (
            <div className="text-center py-8 text-border-light">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune zone trouvée pour &quot;{searchTerm}&quot;</p>
            </div>
          )}

          {/* Custom Zones Section */}
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Zones personnalisées
            </h4>

            {/* Add Custom Zone */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={customZoneInput}
                onChange={(e) => setCustomZoneInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCustomZone()}
                placeholder="Ex: Seuils de porte, Barres de toit..."
                className="flex-1 px-3 py-2 border border-border bg-black-light text-foreground placeholder-border-light rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/50 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={addCustomZone}
                disabled={!customZoneInput.trim() || isLoading}
                className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Zones List */}
            {formData.custom_ppf_zones &&
              formData.custom_ppf_zones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.custom_ppf_zones.map((zone, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-accent/20 text-accent px-3 py-1 rounded-full text-sm border border-accent/30"
                    >
                      <span>{zone}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomZone(zone)}
                        disabled={isLoading}
                        className="ml-2 text-accent hover:text-foreground disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Lot Film Information */}
          <div className="border-t border-border pt-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                <Hash className="w-4 h-4 inline mr-1" />
                Numéro de lot du film (optionnel)
                <span className="text-xs text-border-light ml-1">
                  Format recommandé: LOT-YYYY-NNN
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="lot_film"
                  value={formData.lot_film || ""}
                  onChange={(e) => {
                    // Auto-format lot number: convert to uppercase and add LOT- prefix if not present
                    let value = e.target.value.toUpperCase();
                    if (value && !value.startsWith("LOT-")) {
                      // If it doesn't start with LOT-, try to format it
                      if (/^\d{4}-\d+$/.test(value)) {
                        value = "LOT-" + value;
                      } else if (/^\d{4}\d+$/.test(value)) {
                        value =
                          "LOT-" + value.slice(0, 4) + "-" + value.slice(4);
                      }
                    }
                    onChange({ lot_film: value });
                  }}
                  placeholder="Ex: LOT-2024-001"
                  className="w-full px-3 py-2 border border-border bg-black-light text-foreground placeholder-border-light rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  disabled={isLoading}
                  aria-describedby="lot-film-help"
                />
                {formData.lot_film && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                )}
              </div>

              {/* Enhanced Help Text */}
              <div
                id="lot-film-help"
                className="text-xs text-border-light space-y-1"
              >
                <p>
                  Le numéro de lot aide au suivi qualité et à la traçabilité
                </p>
                {formData.lot_film && (
                  <div className="bg-accent/10 border border-accent/30 rounded p-2">
                    <p className="text-accent font-medium">
                      Format détecté: {formData.lot_film}
                    </p>
                    <p className="text-accent text-xs">
                      Ce format facilite le suivi et la gestion des stocks
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          {getTotalSelectedZones() > 0 && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Résumé de la sélection ({getTotalSelectedZones()} zones)
              </h4>
              <div className="space-y-2">
                {/* Standard zones */}
                {formData.ppf_zones && formData.ppf_zones.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">
                      Zones standard :
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {formData.ppf_zones.map((zoneId) => {
                        const zone = PPF_ZONES.find((z) => z.id === zoneId);
                        return zone ? (
                          <span
                            key={zoneId}
                            className="text-xs bg-accent/20 text-accent px-2 py-1 rounded border border-accent/30"
                          >
                            {zone.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Custom zones */}
                {formData.custom_ppf_zones &&
                  formData.custom_ppf_zones.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">
                        Zones personnalisées :
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formData.custom_ppf_zones.map((zone, index) => (
                          <span
                            key={index}
                            className="text-xs bg-accent/20 text-accent px-2 py-1 rounded border border-accent/30"
                          >
                            {zone}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.ppf_zones && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-500">{errors.ppf_zones}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Conseils de sélection :</p>
                <ul className="space-y-1 text-border-light">
                  <li>
                    • Sélectionnez toutes les zones exposées aux impacts et
                    rayures
                  </li>
                  <li>
                    • Les zones &quot;complet&quot; incluent automatiquement
                    toutes les sous-zones
                  </li>
                  <li>
                    • Ajoutez des zones personnalisées pour des besoins
                    spécifiques
                  </li>
                  <li>
                    • Le numéro de lot facilite le suivi en cas de réclamation
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