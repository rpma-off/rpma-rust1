"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SecurityPolicy } from "@/shared/types";
import { useSecurityPolicies } from "../hooks/useSecurityPolicies";
import {
  DEFAULT_SECURITY_POLICY_FORM,
  SecurityPolicyForm,
  type SecurityPolicyFormState,
} from "./security-policies/security-policy-form";
import { SecurityPolicyList } from "./security-policies/security-policy-list";

function buildPolicyPayload(
  formData: SecurityPolicyFormState,
  editingPolicy: SecurityPolicy | null,
): SecurityPolicy {
  const now = new Date().toISOString();

  return {
    id: editingPolicy?.id || crypto.randomUUID(),
    name: formData.name,
    description: formData.description || formData.name,
    policy_type: formData.type,
    type: formData.type,
    is_active: formData.isActive,
    isActive: formData.isActive,
    applies_to: formData.appliesTo,
    appliesTo: formData.appliesTo,
    settings: formData.settings as unknown as Record<string, unknown>,
    exceptions: [],
    created_at: editingPolicy?.created_at || now,
    updated_at: now,
    createdAt: editingPolicy?.createdAt || now,
    updatedAt: now,
  };
}

export function SecurityPoliciesTab() {
  const {
    policies,
    loading,
    saving,
    save,
    remove,
    toggle,
  } = useSecurityPolicies();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicy | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("password");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<SecurityPolicy | null>(null);
  const [formData, setFormData] = useState<SecurityPolicyFormState>(
    DEFAULT_SECURITY_POLICY_FORM,
  );

  const resetForm = () => {
    setFormData(DEFAULT_SECURITY_POLICY_FORM);
    setActiveSubTab("password");
  };

  const handleCreateOpen = () => {
    resetForm();
    setEditingPolicy(null);
  };

  const handleEditOpen = (policy: SecurityPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      ...DEFAULT_SECURITY_POLICY_FORM,
      name: policy.name,
      description: policy.description || "",
      type: policy.type,
      isActive: policy.isActive || policy.is_active || false,
      settings: {
        ...DEFAULT_SECURITY_POLICY_FORM.settings,
        ...policy.settings,
      },
      appliesTo: policy.appliesTo || policy.applies_to || [],
      exceptions: (policy.exceptions || []).map((exception) => exception.id),
    });
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    await save(buildPolicyPayload(formData, editingPolicy), !!editingPolicy);
    setShowCreateDialog(false);
    setEditingPolicy(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!policyToDelete) return;
    await remove(policyToDelete.id);
    setDeleteConfirmOpen(false);
    setPolicyToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Politiques de Sécurité</h2>
          <p className="text-gray-600">
            Gérez les politiques de sécurité et les contrôles d&apos;accès
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateOpen}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Politique
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPolicy
                  ? "Modifier la Politique"
                  : "Nouvelle Politique de Sécurité"}
              </DialogTitle>
              <DialogDescription>
                Créez ou modifiez une politique de sécurité pour protéger votre
                système
              </DialogDescription>
            </DialogHeader>

            <SecurityPolicyForm
              formData={formData}
              activeSubTab={activeSubTab}
              saving={saving}
              editing={!!editingPolicy}
              onActiveSubTabChange={setActiveSubTab}
              onFormChange={setFormData}
              onCancel={() => setShowCreateDialog(false)}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      <SecurityPolicyList
        policies={policies}
        onCreate={() => setShowCreateDialog(true)}
        onEdit={handleEditOpen}
        onToggle={toggle}
        onDelete={(policy) => {
          setPolicyToDelete(policy);
          setDeleteConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Supprimer la politique"
        description={`Voulez-vous vraiment supprimer la politique "${policyToDelete?.name || ""}" ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
