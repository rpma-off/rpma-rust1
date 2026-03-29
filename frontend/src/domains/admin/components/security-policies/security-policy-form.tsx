"use client";

import { Clock, Globe, Lock, Save, Shield, Key, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SecurityPolicyType } from "@/shared/types";

export interface SecurityPolicyFormState {
  name: string;
  description: string;
  type: SecurityPolicyType;
  isActive: boolean;
  settings: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
    preventReuse: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireTwoFactor: boolean;
    allowedIPs: string[];
    blockedIPs: string[];
    rateLimit: number;
    rateLimitWindow: number;
  };
  appliesTo: string[];
  exceptions: string[];
}

interface SecurityPolicyFormProps {
  formData: SecurityPolicyFormState;
  activeSubTab: string;
  saving: boolean;
  editing: boolean;
  onActiveSubTabChange: (value: string) => void;
  onFormChange: (next: SecurityPolicyFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const DEFAULT_SECURITY_POLICY_FORM: SecurityPolicyFormState = {
  name: "",
  description: "",
  type: "password",
  isActive: true,
  settings: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,
    preventReuse: 5,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireTwoFactor: false,
    allowedIPs: [],
    blockedIPs: [],
    rateLimit: 100,
    rateLimitWindow: 15,
  },
  appliesTo: [],
  exceptions: [],
};

function updateSettings(
  formData: SecurityPolicyFormState,
  patch: Partial<SecurityPolicyFormState["settings"]>,
): SecurityPolicyFormState {
  return {
    ...formData,
    settings: {
      ...formData.settings,
      ...patch,
    },
  };
}

export function SecurityPolicyForm({
  formData,
  activeSubTab,
  saving,
  editing,
  onActiveSubTabChange,
  onFormChange,
  onCancel,
  onSave,
}: SecurityPolicyFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="policy-name">Nom de la politique</Label>
          <Input
            id="policy-name"
            value={formData.name}
            onChange={(event) =>
              onFormChange({ ...formData, name: event.target.value })
            }
            placeholder="Nom de la politique"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="policy-type">Type de politique</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              onFormChange({
                ...formData,
                type: value as SecurityPolicyType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="password">Mot de passe</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="api_rate_limit">Limite API</SelectItem>
              <SelectItem value="encryption">Chiffrement</SelectItem>
              <SelectItem value="access_control">Contrôle d&apos;accès</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) =>
            onFormChange({ ...formData, isActive: checked })
          }
        />
        <Label>Politique active</Label>
      </div>

      <Tabs value={activeSubTab} onValueChange={onActiveSubTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="password">Mot de Passe</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="access">Accès</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-length">Longueur minimale</Label>
              <Input
                id="min-length"
                type="number"
                min="6"
                max="32"
                value={formData.settings.minLength}
                onChange={(event) =>
                  onFormChange(
                    updateSettings(formData, {
                      minLength: parseInt(event.target.value, 10) || 8,
                    }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-age">Âge maximum (jours)</Label>
              <Input
                id="max-age"
                type="number"
                min="30"
                max="365"
                value={formData.settings.maxAge}
                onChange={(event) =>
                  onFormChange(
                    updateSettings(formData, {
                      maxAge: parseInt(event.target.value, 10) || 90,
                    }),
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Exiger des majuscules</Label>
              <Switch
                checked={formData.settings.requireUppercase}
                onCheckedChange={(checked) =>
                  onFormChange(
                    updateSettings(formData, {
                      requireUppercase: checked,
                    }),
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exiger des minuscules</Label>
              <Switch
                checked={formData.settings.requireLowercase}
                onCheckedChange={(checked) =>
                  onFormChange(
                    updateSettings(formData, {
                      requireLowercase: checked,
                    }),
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exiger des chiffres</Label>
              <Switch
                checked={formData.settings.requireNumbers}
                onCheckedChange={(checked) =>
                  onFormChange(
                    updateSettings(formData, {
                      requireNumbers: checked,
                    }),
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exiger des caractères spéciaux</Label>
              <Switch
                checked={formData.settings.requireSpecialChars}
                onCheckedChange={(checked) =>
                  onFormChange(
                    updateSettings(formData, {
                      requireSpecialChars: checked,
                    }),
                  )
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="session" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Timeout de session (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                min="5"
                max="480"
                value={formData.settings.sessionTimeout}
                onChange={(event) =>
                  onFormChange(
                    updateSettings(formData, {
                      sessionTimeout: parseInt(event.target.value, 10) || 30,
                    }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-attempts">Tentatives max</Label>
              <Input
                id="max-attempts"
                type="number"
                min="3"
                max="10"
                value={formData.settings.maxLoginAttempts}
                onChange={(event) =>
                  onFormChange(
                    updateSettings(formData, {
                      maxLoginAttempts:
                        parseInt(event.target.value, 10) || 5,
                    }),
                  )
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Exiger l&apos;authentification à deux facteurs</Label>
            <Switch
              checked={formData.settings.requireTwoFactor}
              onCheckedChange={(checked) =>
                onFormChange(
                  updateSettings(formData, {
                    requireTwoFactor: checked,
                  }),
                )
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rate-limit">Limite de taux (requêtes/heure)</Label>
              <Input
                id="rate-limit"
                type="number"
                min="10"
                max="10000"
                value={formData.settings.rateLimit}
                onChange={(event) =>
                  onFormChange(
                    updateSettings(formData, {
                      rateLimit: parseInt(event.target.value, 10) || 100,
                    }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockout-duration">Durée de verrouillage (minutes)</Label>
              <Input
                id="lockout-duration"
                type="number"
                min="5"
                max="60"
                value={formData.settings.lockoutDuration}
                onChange={(event) =>
                  onFormChange(
                    updateSettings(formData, {
                      lockoutDuration: parseInt(event.target.value, 10) || 15,
                    }),
                  )
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {editing ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </div>
  );
}

export const SECURITY_POLICY_TYPE_LABELS: Record<SecurityPolicyType, string> = {
  password: "Mot de passe",
  session: "Session",
  api_rate_limit: "Limite API",
  encryption: "Chiffrement",
  access_control: "Contrôle d'accès",
  authentication: "Authentification",
  authorization: "Autorisation",
  data_protection: "Protection des données",
  compliance: "Conformité",
};

export function getSecurityPolicyTypeIcon(type: SecurityPolicyType) {
  switch (type) {
    case "password":
      return <Key className="h-4 w-4" />;
    case "session":
      return <Clock className="h-4 w-4" />;
    case "api_rate_limit":
      return <Globe className="h-4 w-4" />;
    case "encryption":
      return <Lock className="h-4 w-4" />;
    case "access_control":
      return <Shield className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
}
