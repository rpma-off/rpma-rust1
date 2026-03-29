"use client";

import { Edit, Pause, Play, Plus, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SecurityPolicy, SecurityPolicyType } from "@/shared/types";
import {
  getSecurityPolicyTypeIcon,
  SECURITY_POLICY_TYPE_LABELS,
} from "./security-policy-form";

interface SecurityPolicyListProps {
  policies: SecurityPolicy[];
  onCreate: () => void;
  onEdit: (policy: SecurityPolicy) => void;
  onToggle: (policy: SecurityPolicy) => void;
  onDelete: (policy: SecurityPolicy) => void;
}

export function SecurityPolicyList({
  policies,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
}: SecurityPolicyListProps) {
  if (policies.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Aucune politique de sécurité
          </h3>
          <p className="mb-4 text-gray-600">
            Créez votre première politique de sécurité pour protéger votre système
          </p>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une politique
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {policies.map((policy) => (
        <Card key={policy.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center space-x-3">
                  {getSecurityPolicyTypeIcon(policy.type as SecurityPolicyType)}
                  <h3 className="text-lg font-semibold">{policy.name}</h3>
                  <Badge variant="outline">
                    {SECURITY_POLICY_TYPE_LABELS[policy.type as SecurityPolicyType] ||
                      policy.type}
                  </Badge>
                  <Badge variant={policy.isActive ? "default" : "secondary"}>
                    {policy.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 font-medium">Paramètres:</h4>
                    <ul className="space-y-1">
                      {Object.entries(policy.settings).map(([key, value]) => (
                        <li key={key} className="text-gray-600">
                          {key}:{" "}
                          {typeof value === "boolean"
                            ? value
                              ? "Oui"
                              : "Non"
                            : String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium">Appliquer à:</h4>
                    <p className="text-gray-600">
                      {policy.appliesTo?.length
                        ? policy.appliesTo.join(", ")
                        : "Tous les utilisateurs"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="ml-4 flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => onToggle(policy)}>
                  {policy.isActive ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(policy)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(policy)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
