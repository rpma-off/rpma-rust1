"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  Calendar,
  Clock,
  Eye,
  Globe,
  Info,
  Languages,
  Mail,
  MapPin,
  Phone,
  Settings,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfigurationItem } from "@/shared/types";
import type { BusinessHoursConfig } from "@/shared/types";

export const SYSTEM_SETTINGS_TABS = [
  {
    id: "general",
    label: "Général",
    icon: Settings,
    description: "Paramètres de base de l'entreprise",
  },
  {
    id: "business-hours",
    label: "Heures d'ouverture",
    icon: Clock,
    description: "Configuration des horaires de travail",
  },
  {
    id: "localization",
    label: "Localisation",
    icon: Globe,
    description: "Langue, fuseau horaire et format",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Préférences de notification",
  },
] as const;

export const ConfigurationSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export const BusinessHoursSkeleton = () => (
  <div className="space-y-4">
    {[...Array(7)].map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-lg border border-[hsl(var(--rpma-border))] p-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
    ))}
  </div>
);

export const EmptyConfigState = ({ message }: { message: string }) => (
  <div className="col-span-full rounded-lg border border-dashed border-[hsl(var(--rpma-border))] p-6 text-center">
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

interface RenderFieldProps {
  config: ConfigurationItem;
  updateConfiguration: (id: string, value: string | number | boolean) => void;
}

export function RenderConfigurationField({
  config,
  updateConfiguration,
}: RenderFieldProps) {
  const onChange = (
    input:
      | React.ChangeEvent<HTMLInputElement>
      | string
      | number
      | boolean,
  ) =>
    updateConfiguration(
      config.id,
      typeof input === "object" && "target" in input
        ? input.target?.value || ""
        : input,
    );

  switch (config.data_type) {
    case "boolean":
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={Boolean(config.value)}
            onCheckedChange={(checked) => updateConfiguration(config.id, checked)}
          />
          <span className="text-sm text-muted-foreground">
            {Boolean(config.value) ? "Activé" : "Désactivé"}
          </span>
        </div>
      );
    case "number":
      return (
        <Input
          value={
            typeof config.value === "number"
              ? config.value
              : Number(config.value) || 0
          }
          onChange={onChange}
          className="transition-colors"
          type="number"
          placeholder="Entrez une valeur numérique"
        />
      );
    case "json":
      return (
        <div className="space-y-2">
          <Textarea
            value={JSON.stringify(config.value, null, 2)}
            onChange={(event) => {
              try {
                updateConfiguration(config.id, JSON.parse(event.target.value));
              } catch {
                // Ignore invalid JSON while typing.
              }
            }}
            className="font-mono text-sm"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Format JSON valide requis
          </p>
        </div>
      );
    default:
      return (
        <Input
          value={
            typeof config.value === "string"
              ? config.value
              : String(config.value || "")
          }
          onChange={onChange}
          className="transition-colors"
          type={config.key.toLowerCase().includes("password") ? "password" : "text"}
          placeholder={`Entrez ${config.description?.toLowerCase() || "une valeur"}`}
        />
      );
  }
}

export function SystemSettingsTabs() {
  return (
    <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-1 md:grid-cols-4">
      {SYSTEM_SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex flex-col items-center gap-2 rounded-md p-4 transition-all duration-200 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="font-medium">{tab.label}</span>
            </div>
            <span className="hidden text-center text-xs text-muted-foreground md:block">
              {tab.description}
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}

const COMPANY_ICONS: Record<string, React.ReactNode> = {
  company_name: <Building2 className="h-4 w-4" />,
  company_email: <Mail className="h-4 w-4" />,
  company_phone: <Phone className="h-4 w-4" />,
  company_address: <MapPin className="h-4 w-4" />,
  timezone: <Clock className="h-4 w-4" />,
  language: <Languages className="h-4 w-4" />,
  date_format: <Calendar className="h-4 w-4" />,
  currency: <span className="text-lg">€</span>,
};

interface ConfigurationGridSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  configurations: ConfigurationItem[];
  emptyMessage: string;
  updateConfiguration: (id: string, value: string | number | boolean) => void;
  showMetadata?: boolean;
}

export function ConfigurationGridSection({
  title,
  description,
  icon,
  configurations,
  emptyMessage,
  updateConfiguration,
  showMetadata = false,
}: ConfigurationGridSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {configurations.map((config) => (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor={config.id} className="flex items-center gap-2">
                  {COMPANY_ICONS[config.key]}
                  {config.description}
                  {config.isRequired && (
                    <span className="text-red-500" aria-label="Champ obligatoire">
                      *
                    </span>
                  )}
                  {showMetadata && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 cursor-help text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Configuration: {config.key}</p>
                        <p>Type: {config.data_type}</p>
                        {config.isRequired && <p>Ce champ est obligatoire</p>}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </Label>

                <RenderConfigurationField
                  config={config}
                  updateConfiguration={updateConfiguration}
                />

                {config.isEncrypted && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Valeur chiffrée
                  </div>
                )}
              </motion.div>
            ))}

            {configurations.length === 0 && (
              <EmptyConfigState message={emptyMessage} />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface BusinessHoursSectionProps {
  businessHours: BusinessHoursConfig | null;
  setBusinessHours: React.Dispatch<React.SetStateAction<BusinessHoursConfig>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export function BusinessHoursSection({
  businessHours,
  setBusinessHours,
  setHasChanges,
}: BusinessHoursSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            Heures d&apos;Ouverture
          </CardTitle>
          <CardDescription>
            Définissez les heures de travail pour votre entreprise
          </CardDescription>
        </CardHeader>
        <CardContent>
          {businessHours ? (
            <div className="space-y-4">
              {Object.entries(businessHours.schedule).map(([day, hours]) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between rounded-lg border border-[hsl(var(--rpma-border))] p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{day}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {hours.enabled ? `${hours.start} - ${hours.end}` : "Fermé"}
                      </span>
                    </div>
                    <Switch
                      checked={hours.enabled}
                      onCheckedChange={(enabled) => {
                        setBusinessHours((previous) => {
                          if (!previous) return previous;
                          return {
                            ...previous,
                            schedule: {
                              ...previous.schedule,
                              [day]: { ...hours, enabled },
                            },
                          };
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <BusinessHoursSkeleton />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
