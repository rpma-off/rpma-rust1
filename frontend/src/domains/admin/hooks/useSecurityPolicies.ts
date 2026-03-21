import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SecurityPolicy } from '@/shared/types';
import { settingsOperations } from '@/shared/utils';
import type { JsonValue } from '@/shared/types';

export function useSecurityPolicies() {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsOperations.getAppSettings();
      const appSettings = data as Record<string, JsonValue>;
      const raw = (appSettings?.security_policies || []) as unknown as SecurityPolicy[];
      setPolicies(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error('Error loading security policies:', error);
      toast.error('Erreur lors du chargement des politiques de sécurité');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (
    policy: SecurityPolicy,
    isEditing: boolean,
    existingPolicies: SecurityPolicy[],
  ) => {
    setSaving(true);
    try {
      const updatedPolicies = isEditing
        ? existingPolicies.map((p) => (p.id === policy.id ? policy : p))
        : [...existingPolicies, policy];

      await settingsOperations.updateGeneralSettings(
        { security_policies: updatedPolicies as unknown as JsonValue } as Record<string, JsonValue>,
      );

      toast.success(isEditing ? 'Politique mise à jour avec succès' : 'Politique créée avec succès');
      await reload();
    } catch (error) {
      console.error('Error saving security policy:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [reload]);

  const remove = useCallback(async (
    policyId: string,
    existingPolicies: SecurityPolicy[],
  ) => {
    try {
      const updatedPolicies = existingPolicies.filter((p) => p.id !== policyId);
      await settingsOperations.updateGeneralSettings(
        { security_policies: updatedPolicies as unknown as JsonValue } as Record<string, JsonValue>,
      );
      toast.success('Politique supprimée avec succès');
      await reload();
    } catch (error) {
      console.error('Error deleting security policy:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [reload]);

  const toggle = useCallback(async (
    policy: SecurityPolicy,
    allPolicies: SecurityPolicy[],
  ) => {
    try {
      const updatedPolicies = allPolicies.map((p) =>
        p.id === policy.id
          ? { ...p, is_active: !p.is_active, isActive: !p.is_active }
          : p,
      );
      await settingsOperations.updateGeneralSettings(
        { security_policies: updatedPolicies as unknown as JsonValue } as Record<string, JsonValue>,
      );
      toast.success(`Politique ${policy.is_active ? 'désactivée' : 'activée'} avec succès`);
      await reload();
    } catch (error) {
      console.error('Error updating policy status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [reload]);

  return { policies, loading, saving, reload, save, remove, toggle };
}
