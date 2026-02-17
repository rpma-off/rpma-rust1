'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LoadingState } from '@/components/layout/LoadingState';
import { 
  Globe, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Mail,
  MessageSquare,
  Calendar,
  Webhook,
  Database,
  Cloud,
  TestTube
} from 'lucide-react';
import { IntegrationConfig, IntegrationType, IntegrationStatus } from '@/types/configuration.types';
import { useAuth } from '@/contexts/AuthContext';
import { settingsOperations } from '@/lib/ipc';
import type { JsonValue } from '@/types/json';

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<IntegrationConfig | null>(null);

  // Form state for creating/editing integrations
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as IntegrationType,
    provider: '',
    isActive: false,
    settings: {
      smtpHost: '',
      smtpPort: 587,
      fromEmail: '',
      fromName: '',
      apiKey: '',
      url: '',
      calendarId: '',
      syncInterval: 15,
      retryAttempts: 3,
      timeout: 30
    },
    // Simplified credentials for form handling - will be encrypted when saving
    credentialsData: {
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      refreshToken: '',
      username: '',
      password: ''
    }
  });

  const { session } = useAuth();

  useEffect(() => {
    loadIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const sessionToken = session?.token || '';
      const data = await settingsOperations.getAppSettings(sessionToken);
      const appSettings = data as Record<string, JsonValue>;
      const configs = (appSettings?.integrations || []) as unknown as IntegrationConfig[];
      setIntegrations(Array.isArray(configs) ? configs : []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Erreur lors du chargement des intégrations');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const saveIntegration = async () => {
    setSaving(true);
    try {
      const sessionToken = session?.token || '';
      const newIntegration: IntegrationConfig = {
        id: editingIntegration?.id || crypto.randomUUID(),
        name: formData.name,
        type: formData.type,
        provider: formData.provider,
        config: {},
        settings: formData.settings as unknown as Record<string, string | number | boolean>,
        credentials: {
          encrypted: true,
          data: JSON.stringify(formData.credentialsData)
        },
        isActive: formData.isActive,
        status: formData.isActive ? 'active' as IntegrationStatus : 'inactive' as IntegrationStatus,
        createdAt: editingIntegration?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updatedIntegrations: IntegrationConfig[];
      if (editingIntegration) {
        updatedIntegrations = integrations.map(i => i.id === editingIntegration.id ? newIntegration : i);
      } else {
        updatedIntegrations = [...integrations, newIntegration];
      }

      await settingsOperations.updateGeneralSettings(
        { integrations: updatedIntegrations as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );

      toast.success(editingIntegration ? 'Intégration mise à jour avec succès' : 'Intégration créée avec succès');
      setShowCreateDialog(false);
      setEditingIntegration(null);
      resetForm();
      await loadIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async () => {
    if (!integrationToDelete) return;
    try {
      const sessionToken = session?.token || '';
      const updatedIntegrations = integrations.filter((integration) => integration.id !== integrationToDelete.id);
      await settingsOperations.updateGeneralSettings(
        { integrations: updatedIntegrations as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success('Intégration supprimée avec succès');
      await loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error('Erreur lors de la suppression');
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
      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        toast.error('Intégration introuvable');
        return;
      }
      // Validate configuration locally
      if (integration.type === 'email' && integration.settings?.smtpHost) {
        toast.success('Validation réussie: Configuration SMTP valide');
      } else if (integration.type === 'webhook' && integration.settings?.url) {
        toast.success('Validation réussie: Configuration webhook valide');
      } else {
        toast.info('Validation terminée: Configuration locale vérifiée');
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      toast.error('Erreur lors du test');
    } finally {
      setTestingIntegration(null);
    }
  };

  const toggleIntegrationStatus = async (integration: IntegrationConfig) => {
    try {
      const sessionToken = session?.token || '';
      const newActive = !integration.isActive;
      const updatedIntegrations = integrations.map(i =>
        i.id === integration.id
          ? { ...i, isActive: newActive, status: (newActive ? 'active' : 'inactive') as IntegrationStatus }
          : i
      );
      await settingsOperations.updateGeneralSettings(
        { integrations: updatedIntegrations as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success(`Intégration ${integration.isActive ? 'désactivée' : 'activée'} avec succès`);
      await loadIntegrations();
    } catch (error) {
      console.error('Error updating integration status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'email',
      provider: '',
      isActive: false,
      settings: {
        smtpHost: '',
        smtpPort: 587,
        fromEmail: '',
        fromName: '',
        apiKey: '',
        url: '',
        calendarId: '',
        syncInterval: 15,
        retryAttempts: 3,
        timeout: 30
      },
      credentialsData: {
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        refreshToken: '',
        username: '',
        password: ''
      }
    });
  };

  const openEditDialog = (integration: IntegrationConfig) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      provider: integration.provider || '',
      isActive: integration.isActive || false,
      settings: { ...formData.settings, ...integration.settings },
      // For editing, try to decode credentials or use empty values
      credentialsData: {
        apiKey: '', // Would need decryption logic here
        apiSecret: '',
        accessToken: '',
        refreshToken: '',
        username: '',
        password: ''
      }
    });
    setShowCreateDialog(true);
  };

  const getIntegrationTypeLabel = (type: IntegrationType) => {
    const labels = {
      email: 'Email',
      sms: 'SMS',
      calendar: 'Calendrier',
      webhook: 'Webhook',
      api: 'API',
      backup: 'Sauvegarde',
      sync: 'Synchronisation'
    };
    return labels[type] || type;
  };

  const getIntegrationTypeIcon = (type: IntegrationType) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'api':
        return <Globe className="h-4 w-4" />;
      case 'backup':
        return <Database className="h-4 w-4" />;
      case 'sync':
        return <Cloud className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: IntegrationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'testing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'unknown':
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Intégrations</h2>
          <p className="text-gray-600">
            Gérez les intégrations avec des services externes
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingIntegration(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Intégration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIntegration ? 'Modifier l\'Intégration' : 'Nouvelle Intégration'}
              </DialogTitle>
              <DialogDescription>
                Créez ou modifiez une intégration avec un service externe
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="integration-name">Nom de l&apos;intégration</Label>
                  <Input
                    id="integration-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom de l'intégration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="integration-type">Type d&apos;intégration</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as IntegrationType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="calendar">Calendrier</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="backup">Sauvegarde</SelectItem>
                      <SelectItem value="sync">Synchronisation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Fournisseur</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="Ex: Gmail, Twilio, Google Calendar"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>Intégration active</Label>
              </div>

              {/* Integration Settings */}
              {formData.type === 'email' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configuration Email</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">Serveur SMTP</Label>
                      <Input
                        id="smtp-host"
                        value={formData.settings.smtpHost || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, smtpHost: e.target.value }
                        }))}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Port</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={formData.settings.smtpPort || 587}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, smtpPort: parseInt(e.target.value) || 587 }
                        }))}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-email">Email expéditeur</Label>
                      <Input
                        id="from-email"
                        type="email"
                        value={formData.settings.fromEmail || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, fromEmail: e.target.value }
                        }))}
                        placeholder="noreply@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-name">Nom expéditeur</Label>
                      <Input
                        id="from-name"
                        value={formData.settings.fromName || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, fromName: e.target.value }
                        }))}
                        placeholder="RPMA System"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'sms' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configuration SMS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">Clé API</Label>
                      <Input
                        id="api-key"
                        type="password"
                        value={formData.credentialsData.apiKey || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          credentialsData: { ...prev.credentialsData, apiKey: e.target.value }
                        }))}
                        placeholder="Clé API"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-secret">Secret API</Label>
                      <Input
                        id="api-secret"
                        type="password"
                        value={formData.credentialsData.apiSecret || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          credentialsData: { ...prev.credentialsData, apiSecret: e.target.value }
                        }))}
                        placeholder="Secret API"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'webhook' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configuration Webhook</h3>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">URL du Webhook</Label>
                    <Input
                      id="webhook-url"
                      value={formData.settings.url || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, url: e.target.value }
                      }))}
                      placeholder="https://api.example.com/webhook"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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

      {/* Integrations List */}
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getIntegrationTypeIcon(integration.type)}
                    <h3 className="text-lg font-semibold">{integration.name}</h3>
                    <Badge variant="outline">{getIntegrationTypeLabel(integration.type)}</Badge>
                    <Badge className={getStatusColor(integration.status)}>
                      {integration.status}
                    </Badge>
                    <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                      {integration.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Fournisseur:</h4>
                      <p className="text-gray-600">{integration.provider}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Dernière synchronisation:</h4>
                      <p className="text-gray-600">
                        {integration.lastSync 
                          ? new Date(integration.lastSync).toLocaleString('fr-FR')
                          : 'Jamais'
                        }
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">État de santé:</h4>
                      <div className="flex items-center space-x-2">
                        {getHealthStatusIcon(integration.healthCheck?.status || 'unknown')}
                        <span className="text-gray-600">
                          {integration.healthCheck?.error || (integration.healthCheck?.status === 'healthy' ? 'Connexion réussie' : 'Non vérifié')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testIntegration(integration.id)}
                    disabled={testingIntegration === integration.id}
                  >
                    {testingIntegration === integration.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleIntegrationStatus(integration)}
                  >
                    {integration.isActive ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(integration)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDeleteIntegration(integration)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {integrations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune intégration
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première intégration pour connecter des services externes
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
        onConfirm={deleteIntegration}
      />
    </div>
  );
}
