"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  FileText,
  Timer,
} from "lucide-react";
import { FormStepProps, TIME_SLOTS } from "../types";

export const ScheduleStep: React.FC<FormStepProps> = ({
  formData,
  onChange,
  errors = {},
  isLoading = false,
}) => {
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);

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

  // Calculate estimated duration based on selected zones
  useEffect(() => {
    const totalZones =
      (formData.ppf_zones?.length || 0) +
      (formData.custom_ppf_zones?.length || 0);
    // Rough estimation: 30 minutes per zone (minimum 2 hours)
    const estimated = Math.max(120, totalZones * 30);
    setEstimatedDuration(estimated);
  }, [formData.ppf_zones, formData.custom_ppf_zones]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const handleTimeChange = (field: string, value: string) => {
    onChange({ [field]: value });
  };

  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split("T")[0];
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const isDayPassed = (dateString: string) => {
    const today = new Date();
    const selectedDate = new Date(dateString);
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins.toString().padStart(2, "0")}`;
  };

  const getFieldStatus = (fieldName: string) => {
    if (errors[fieldName]) return "error";
    if (formData[fieldName as keyof typeof formData]) return "success";
    return "default";
  };

  const renderFieldIcon = (fieldName: string) => {
    const status = getFieldStatus(fieldName);
    if (status === "error") {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    } else if (status === "success") {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return null;
  };

  const suggestEndTime = useCallback(
    (startTime: string) => {
      if (!startTime) return "";

      const [hours, minutes] = startTime.split(":").map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);

      // Add estimated duration
      const endDate = new Date(startDate.getTime() + estimatedDuration * 60000);

      // Round to nearest 30 minutes
      const endMinutes = endDate.getMinutes();
      const roundedMinutes = Math.ceil(endMinutes / 30) * 30;
      endDate.setMinutes(roundedMinutes, 0, 0);

      // Ensure we don't go past 18:00
      if (endDate.getHours() >= 18) {
        endDate.setHours(18, 0, 0, 0);
      }

      return endDate.toTimeString().slice(0, 5);
    },
    [estimatedDuration],
  );

  // Auto-suggest end time when start time changes
  useEffect(() => {
    if (formData.start_time && !formData.end_time) {
      const suggestedEndTime = suggestEndTime(formData.start_time);
      if (suggestedEndTime) {
        onChange({ end_time: suggestedEndTime });
      }
    }
  }, [
    formData.start_time,
    formData.end_time,
    estimatedDuration,
    onChange,
    suggestEndTime,
  ]);

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      <div className="bg-muted rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent/20 to-accent/10 p-3 sm:p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-accent mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Planification de l&apos;intervention
              </h3>
            </div>
            <div className="text-xs sm:text-sm bg-accent/20 px-2 sm:px-3 py-1 rounded-full">
              <span className="font-medium text-accent">
                <Timer className="w-4 h-4 inline mr-1" />~
                {formatDuration(estimatedDuration)}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-border-light mt-1">
            Définissez la date et les horaires de l&apos;intervention PPF
          </p>
        </div>

        {/* Form Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de rendez-vous *
            </label>
            <div className="relative">
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date || ""}
                onChange={handleChange}
                min={getMinDate()}
                max={getMaxDate()}
                className={`
                  w-full px-3 py-2 border rounded-lg transition-all duration-200 bg-black-light text-foreground
                  ${
                    errors.scheduled_date
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                      : formData.scheduled_date
                        ? "border-accent focus:border-accent focus:ring-accent/50"
                        : "border-border focus:border-border-light focus:ring-border-light/50"
                  }
                  focus:ring-2 focus:outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                disabled={isLoading}
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {renderFieldIcon("scheduled_date")}
              </div>
            </div>

            {/* Date validation warnings */}
            {formData.scheduled_date &&
              isDayPassed(formData.scheduled_date) && (
                <p className="text-sm text-red-400 flex items-center mt-1">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  La date sélectionnée est dans le passé
                </p>
              )}

            {formData.scheduled_date && isWeekend(formData.scheduled_date) && (
              <p className="text-sm text-yellow-400 flex items-center mt-1">
                <Info className="w-4 h-4 mr-1 flex-shrink-0" />
                Week-end sélectionné - vérifiez les disponibilités
              </p>
            )}

            {errors.scheduled_date && (
              <p className="text-sm text-red-400 flex items-center mt-1">
                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                {errors.scheduled_date}
              </p>
            )}
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              Heure de rendez-vous *
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleTimeChange("scheduled_time", time)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                    ${
                      formData.scheduled_time === time
                        ? "bg-accent text-black border-accent"
                        : "bg-black-light text-foreground border-border hover:bg-muted hover:border-border-light"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  disabled={isLoading}
                >
                  {time}
                </button>
              ))}
            </div>

            {/* Custom time input */}
            <div className="mt-3">
              <label className="text-xs text-border-light mb-1 block">
                Ou saisissez une heure personnalisée :
              </label>
              <input
                type="time"
                name="scheduled_time"
                value={formData.scheduled_time || ""}
                onChange={handleChange}
                className="w-32 px-3 py-1 text-sm border border-border bg-black-light text-foreground rounded focus:border-accent focus:ring-2 focus:ring-accent/50 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            {errors.scheduled_time && (
              <p className="text-sm text-red-400 flex items-center mt-1">
                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                {errors.scheduled_time}
              </p>
            )}
          </div>

          {/* Duration and Working Hours */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
              <Timer className="w-4 h-4 mr-2" />
              Estimation de durée
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Time */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-foreground">
                  Heure de début (optionnel)
                </label>
                <select
                  name="start_time"
                  value={formData.start_time || ""}
                  onChange={(e) =>
                    handleTimeChange("start_time", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-black-light text-foreground focus:border-accent focus:ring-2 focus:ring-accent/50 focus:outline-none"
                  disabled={isLoading}
                >
                  <option value="">Sélectionner...</option>
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-foreground">
                  Heure de fin (optionnel)
                </label>
                <select
                  name="end_time"
                  value={formData.end_time || ""}
                  onChange={(e) => handleTimeChange("end_time", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-black-light text-foreground focus:border-accent focus:ring-2 focus:ring-accent/50 focus:outline-none"
                  disabled={isLoading}
                >
                  <option value="">Sélectionner...</option>
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration calculation */}
            {formData.start_time && formData.end_time && (
              <div className="mt-3 text-sm text-foreground">
                <p>
                  Durée prévue :{" "}
                  {(() => {
                    const start = new Date(
                      `1970-01-01T${formData.start_time}:00`,
                    );
                    const end = new Date(`1970-01-01T${formData.end_time}:00`);
                    const diffMinutes =
                      (end.getTime() - start.getTime()) / (1000 * 60);
                    return diffMinutes > 0
                      ? formatDuration(diffMinutes)
                      : "Heure de fin invalide";
                  })()}
                </p>
              </div>
            )}

            <p className="text-xs text-border-light mt-2">
              Estimation basée sur{" "}
              {(formData.ppf_zones?.length || 0) +
                (formData.custom_ppf_zones?.length || 0)}{" "}
              zones sélectionnées
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes et instructions (optionnel)
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              placeholder="Instructions spéciales, préparatifs nécessaires, particularités du véhicule..."
              rows={4}
              maxLength={1000}
              className={`
                w-full px-3 py-2 border rounded-lg transition-all duration-200 resize-none bg-black-light text-foreground placeholder-border-light
                ${
                  errors.notes
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                    : "border-border focus:border-border-light focus:ring-border-light/50"
                }
                focus:ring-2 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center">
              <div>
                {errors.notes && (
                  <p className="text-sm text-red-400 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    {errors.notes}
                  </p>
                )}
              </div>
              <p className="text-xs text-border-light">
                {formData.notes?.length || 0}/1000 caractères
              </p>
            </div>
          </div>

          {/* Summary Card */}
          {formData.scheduled_date && formData.scheduled_time && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-accent" />
                Récapitulatif du rendez-vous
              </h4>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-accent" />
                  <span>
                    {new Date(formData.scheduled_date).toLocaleDateString(
                      "fr-FR",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-accent" />
                  <span>
                    À {formData.scheduled_time}
                    {formData.start_time && formData.end_time && (
                      <span className="ml-2 text-border-light">
                        (Travaux de {formData.start_time} à {formData.end_time})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center">
                  <Timer className="w-4 h-4 mr-2 text-accent" />
                  <span>
                    Durée estimée : {formatDuration(estimatedDuration)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-accent mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Informations importantes :</p>
                <ul className="space-y-1 text-border-light">
                  <li>• Prévoir un espace de travail propre et éclairé</li>
                  <li>• Le véhicule doit être lavé et décontaminé</li>
                  <li>• Durée estimée basée sur la complexité des zones</li>
                  <li>
                    • Possibilité d&apos;ajustement selon les conditions réelles
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