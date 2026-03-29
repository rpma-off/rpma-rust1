"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, Building2, Globe, RefreshCw, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSystemSettings } from "../hooks/useSystemSettings";
import {
  ConfigurationGridSection,
  ConfigurationSkeleton,
  BusinessHoursSection,
  SystemSettingsTabs,
} from "./system-settings/SystemSettingsSections";

export function SystemSettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState("general");
  const {
    configurations,
    businessHours,
    loading,
    saving,
    resetting,
    hasChanges,
    save,
    reset,
    updateConfiguration,
    setBusinessHours,
    setHasChanges,
  } = useSystemSettings();

  const companyConfigurations = configurations.filter((config) =>
    ["company_name", "company_email", "company_phone", "company_address"].includes(
      config.key,
    ),
  );
  const localizationConfigurations = configurations.filter((config) =>
    ["timezone", "language", "date_format", "currency"].includes(config.key),
  );
  const notificationConfigurations = configurations.filter((config) =>
    config.key.includes("notification"),
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <ConfigurationSkeleton />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Paramètres Système
            </h2>
            <p className="mt-1 text-muted-foreground">
              Configurez les paramètres généraux de votre système
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Alert className="flex items-center gap-2 border-yellow-300 bg-yellow-50 py-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Modifications non sauvegardées</span>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={reset}
              disabled={!hasChanges || saving || resetting}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`}
              />
              {resetting ? "Réinitialisation..." : "Annuler"}
            </Button>

            <Button
              onClick={save}
              disabled={!hasChanges || saving || resetting}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </div>
        </motion.div>

        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <SystemSettingsTabs />

          <TabsContent value="general" className="mt-6">
            <ConfigurationGridSection
              title="Informations de l'Entreprise"
              description="Configurez les informations de base de votre entreprise"
              icon={<Building2 className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
              configurations={companyConfigurations}
              emptyMessage="Aucun paramètre d'entreprise disponible."
              updateConfiguration={updateConfiguration}
              showMetadata
            />
          </TabsContent>

          <TabsContent value="business-hours" className="mt-6">
            <BusinessHoursSection
              businessHours={businessHours}
              setBusinessHours={setBusinessHours}
              setHasChanges={setHasChanges}
            />
          </TabsContent>

          <TabsContent value="localization" className="mt-6">
            <ConfigurationGridSection
              title="Localisation"
              description="Configurez la langue, le fuseau horaire et les formats"
              icon={<Globe className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
              configurations={localizationConfigurations}
              emptyMessage="Aucun paramètre de localisation disponible."
              updateConfiguration={updateConfiguration}
            />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <ConfigurationGridSection
              title="Notifications"
              description="Configurez les préférences de notification"
              icon={<Bell className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />}
              configurations={notificationConfigurations}
              emptyMessage="Aucun paramètre de notification disponible."
              updateConfiguration={updateConfiguration}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
