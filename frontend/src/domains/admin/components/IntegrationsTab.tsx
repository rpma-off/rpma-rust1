'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Globe, Plus, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import {
  IntegrationConfig,
  IntegrationType,
  IntegrationStatus,
} from '@/shared/types';
import { useIntegrations } from '../hooks/useIntegrations';
import { IntegrationCard } from './IntegrationCard';

export function IntegrationsTab() {
  const {
    integrations,
    loading,
    saving,
    persistIntegration,
    deleteIntegration,
    testIntegration: runIntegrationTest,
  } = useIntegrations();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<IntegrationConfig | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] =
    useState<IntegrationConfig | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'webhook' as IntegrationType,
    provider: '',
    isActive: false,
    settings: {
      url: '',
      subscribedEvents: 'task_created',
    },
    credentialsData: {
      apiKey: '',
    },
  });

  const saveIntegration = async () => {
    try {
      const newIntegration: IntegrationConfig = {
        id: editingIntegration?.id || crypto.randomUUID(),
        name: formData.name,
        type: formData.type,
        provider: formData.provider,
        config: {},
        settings: formData.settings as Record<string, string | number | boolean>,
        credentials: formData.credentialsData.apiKey
          ? {
              encrypted: true,
              data: formData.credentialsData.apiKey,
            }
          : undefined,
        isActive: formData.isActive,
        status: formData.isActive
          ? ('active' as IntegrationStatus)
          : ('inactive' as IntegrationStatus),
        createdAt: editingIntegration?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await persistIntegration(
        newIntegration,
        editingIntegration
          ? 'Intégration mise à jour avec succès'
          : 'Intégration créée avec succès',
        editingIntegration,
      );
      setShowCreateDialog(false);
      setEditingIntegration(null);
      resetForm();
    } catch {
      // Error already surfaced by useIntegrations onError (toast shown there)
    }
  };

  const handleDeleteIntegration = async () => {
    if (!integrationToDelete) return;
    try {
      await deleteIntegration(integrationToDelete.id);
    } catch {
      // Error already surfaced by useIntegrations onError (toast shown there)
    } finally {
      setDeleteConfirmOpen(false);
      setIntegrationToDelete(null);
    }
  };

  const confirmDeleteIntegration = (integration: IntegrationConfig) => {
    setIntegrationToDelete(integration);
    setDeleteConfirmOpen(true);
  };

  const testIntegration = async (id: string) => {
    setTestingIntegration(id);
    try {
      const result = await runIntegrationTest(id);
      toast[result.success ? 'success' : 'error'](result.message);
    } catch (error) {
      console.error('Error testing integration:', error);
      toast.error('Erreur lors du test');
    } finally {
      setTestingIntegration(null);
    }
  };

  const toggleIntegrationStatus = async (integration: IntegrationConfig) => {
    try {
      const newActive = !integration.isActive;
      await persistIntegration(
        {
          ...integration,
          isActive: newActive,
          status: (newActive ? 'active' : 'inactive') as IntegrationStatus,
        },
        `Intégration ${integration.isActive ? 'désactivée' : 'activée'} avec succès`,
        integration,
      );
    } catch {
      // Error already surfaced by useIntegrations onError (toast shown there)
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'webhook',
      provider: '',
      isActive: false,
      settings: {
        url: '',
        subscribedEvents: 'task_created',
      },
      credentialsData: {
        apiKey: '',
      },
    });
  };

  const openEditDialog = (integration: IntegrationConfig) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      type: 'webhook',
      provider: integration.provider || '',
      isActive: integration.isActive || false,
      settings: {
        url: String(integration.settings?.url || ''),
        subscribedEvents: String(
          integration.settings?.subscribedEvents || 'task_created',
        ),
      },
      credentialsData: {
        apiKey: '',
      },
    });
    setShowCreateDialog(true);
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Intégrations</h2>
          <p className="text-gray-600">
            Gérez les intégrations webhook avec des services externes
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setEditingIntegration(null);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Intégration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIntegration
                  ? "Modifier l'intégration"
                  : 'Nouvelle intégration'}
              </DialogTitle>
              <DialogDescription>
                La V1 supporte les webhooks HTTP sortants.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="integration-name">Nom</Label>
                  <Input
                    id="integration-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Webhook ERP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="integration-type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: value as IntegrationType,
                      }))
                    }
                  >
                    <SelectTrigger id="integration-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Description / fournisseur</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      provider: e.target.value,
                    }))
                  }
                  placeholder="ERP interne, Make, Zapier..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label>Intégration active</Label>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration Webhook</h3>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL</Label>
                  <Input
                    id="webhook-url"
                    value={formData.settings.url}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, url: e.target.value },
                      }))
                    }
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-events">Événements abonnés</Label>
                  <Input
                    id="webhook-events"
                    value={formData.settings.subscribedEvents}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          subscribedEvents: e.target.value,
                        },
                      }))
                    }
                    placeholder="task_created, task_status_changed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-token">Bearer token</Label>
                  <Input
                    id="webhook-token"
                    type="password"
                    value={formData.credentialsData.apiKey}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        credentialsData: {
                          ...prev.credentialsData,
                          apiKey: e.target.value,
                        },
                      }))
                    }
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Annuler
                </Button>
                <Button onClick={saveIntegration} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingIntegration ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            testingIntegration={testingIntegration}
            onTest={testIntegration}
            onToggleStatus={toggleIntegrationStatus}
            onEdit={openEditDialog}
            onDelete={confirmDeleteIntegration}
          />
        ))}

        {integrations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune intégration
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première intégration webhook.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une intégration
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Supprimer l'intégration"
        description={`Voulez-vous vraiment supprimer l'intégration "${integrationToDelete?.name || ''}" ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={handleDeleteIntegration}
      />
    </div>
  );
}
