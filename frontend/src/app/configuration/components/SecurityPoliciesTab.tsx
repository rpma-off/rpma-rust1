'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Save,
  RefreshCw,
  Lock,
  Clock,
  Globe,
  Key,
  Eye
} from 'lucide-react';
import { SecurityPolicy, SecurityPolicyType } from '@/types/configuration.types';

export function SecurityPoliciesTab() {
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicy | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('password');

  // Form state for creating/editing policies
  const [formData, setFormData] = useState({
    name: '',
    type: 'password' as SecurityPolicyType,
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
      allowedIPs: [] as string[],
      blockedIPs: [] as string[],
      rateLimit: 100,
      rateLimitWindow: 15
    },
    appliesTo: [] as string[],
    exceptions: [] as string[]
  });

  useEffect(() => {
    loadSecurityPolicies();
  }, []);

  const loadSecurityPolicies = async () => {
    try {
      const response = await fetch('/api/admin/security-policies');
      if (!response.ok) {
        throw new Error('Failed to load security policies');
      }
      const data = await response.json();
      setSecurityPolicies(data);
    } catch (error) {
      console.error('Error loading security policies:', error);
      setSecurityPolicies([]);
      toast.error('Erreur lors du chargement des politiques de sécurité');
    } finally {
      setLoading(false);
    }
  };

  const saveSecurityPolicy = async () => {
    setSaving(true);
    try {
      const url = editingPolicy 
        ? `/api/admin/security-policies/${editingPolicy.id}`
        : '/api/admin/security-policies';
      
      const method = editingPolicy ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingPolicy ? 'Politique mise à jour avec succès' : 'Politique créée avec succès');
        setShowCreateDialog(false);
        setEditingPolicy(null);
        resetForm();
        loadSecurityPolicies();
      } else {
        throw new Error('Failed to save security policy');
      }
    } catch (error) {
      console.error('Error saving security policy:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteSecurityPolicy = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette politique ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/security-policies/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Politique supprimée avec succès');
        loadSecurityPolicies();
      } else {
        throw new Error('Failed to delete security policy');
      }
    } catch (error) {
      console.error('Error deleting security policy:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePolicyStatus = async (policy: SecurityPolicy) => {
    try {
      const response = await fetch(`/api/admin/security-policies/${policy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });

      if (response.ok) {
        toast.success(`Politique ${policy.isActive ? 'désactivée' : 'activée'} avec succès`);
        loadSecurityPolicies();
      } else {
        throw new Error('Failed to update policy status');
      }
    } catch (error) {
      console.error('Error updating policy status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'password',
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
        rateLimitWindow: 15
      },
      appliesTo: [],
      exceptions: []
    });
  };

  const openEditDialog = (policy: SecurityPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      type: policy.type as SecurityPolicyType,
      isActive: policy.isActive || policy.is_active || false,
      settings: { ...formData.settings, ...policy.settings },
      appliesTo: policy.appliesTo || policy.applies_to || [],
      exceptions: (policy.exceptions || []).map(e => e.id)
    });
    setShowCreateDialog(true);
  };

  const getPolicyTypeLabel = (type: SecurityPolicyType) => {
    const labels = {
      password: 'Mot de passe',
      session: 'Session',
      api_rate_limit: 'Limite API',
      encryption: 'Chiffrement',
      access_control: 'Contrôle d\'accès',
      authentication: 'Authentification',
      authorization: 'Autorisation',
      data_protection: 'Protection des données',
      compliance: 'Conformité'
    };
    return labels[type] || type;
  };

  const getPolicyTypeIcon = (type: SecurityPolicyType) => {
    switch (type) {
      case 'password':
        return <Key className="h-4 w-4" />;
      case 'session':
        return <Clock className="h-4 w-4" />;
      case 'api_rate_limit':
        return <Globe className="h-4 w-4" />;
      case 'encryption':
        return <Lock className="h-4 w-4" />;
      case 'access_control':
        return <Shield className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Politiques de Sécurité</h2>
          <p className="text-gray-600">
            Gérez les politiques de sécurité et les contrôles d&apos;accès
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPolicy(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Politique
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPolicy ? 'Modifier la Politique' : 'Nouvelle Politique de Sécurité'}
              </DialogTitle>
              <DialogDescription>
                Créez ou modifiez une politique de sécurité pour protéger votre système
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy-name">Nom de la politique</Label>
                  <Input
                    id="policy-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom de la politique"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy-type">Type de politique</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as SecurityPolicyType }))}
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
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>Politique active</Label>
              </div>

              {/* Policy Settings */}
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="password">Mot de Passe</TabsTrigger>
                  <TabsTrigger value="session">Session</TabsTrigger>
                  <TabsTrigger value="access">Accès</TabsTrigger>
                </TabsList>

                <TabsContent value="password" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-length">Longueur minimale</Label>
                      <Input
                        id="min-length"
                        type="number"
                        min="6"
                        max="32"
                        value={formData.settings.minLength}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, minLength: parseInt(e.target.value) || 8 }
                        }))}
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
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, maxAge: parseInt(e.target.value) || 90 }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Exiger des majuscules</Label>
                      <Switch
                        checked={formData.settings.requireUppercase}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, requireUppercase: checked }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Exiger des minuscules</Label>
                      <Switch
                        checked={formData.settings.requireLowercase}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, requireLowercase: checked }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Exiger des chiffres</Label>
                      <Switch
                        checked={formData.settings.requireNumbers}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, requireNumbers: checked }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Exiger des caractères spéciaux</Label>
                      <Switch
                        checked={formData.settings.requireSpecialChars}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, requireSpecialChars: checked }
                        }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="session" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Timeout de session (minutes)</Label>
                      <Input
                        id="session-timeout"
                        type="number"
                        min="5"
                        max="480"
                        value={formData.settings.sessionTimeout}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, sessionTimeout: parseInt(e.target.value) || 30 }
                        }))}
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
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, maxLoginAttempts: parseInt(e.target.value) || 5 }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Exiger l&apos;authentification à deux facteurs</Label>
                    <Switch
                      checked={formData.settings.requireTwoFactor}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requireTwoFactor: checked }
                      }))}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="access" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rate-limit">Limite de taux (requêtes/heure)</Label>
                      <Input
                        id="rate-limit"
                        type="number"
                        min="10"
                        max="10000"
                        value={formData.settings.rateLimit}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, rateLimit: parseInt(e.target.value) || 100 }
                        }))}
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
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, lockoutDuration: parseInt(e.target.value) || 15 }
                        }))}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={saveSecurityPolicy} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingPolicy ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Policies List */}
      <div className="grid gap-4">
        {securityPolicies.map((policy) => (
          <Card key={policy.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getPolicyTypeIcon(policy.type as SecurityPolicyType)}
                    <h3 className="text-lg font-semibold">{policy.name}</h3>
                    <Badge variant="outline">{getPolicyTypeLabel(policy.type as SecurityPolicyType)}</Badge>
                    <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                      {policy.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Paramètres:</h4>
                      <ul className="space-y-1">
                        {Object.entries(policy.settings).map(([key, value]) => (
                          <li key={key} className="text-gray-600">
                            {key}: {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Appliquer à:</h4>
                      <p className="text-gray-600">
                        {policy.appliesTo?.length ? policy.appliesTo.join(', ') : 'Tous les utilisateurs'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePolicyStatus(policy)}
                  >
                    {policy.isActive ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(policy)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteSecurityPolicy(policy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {securityPolicies.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune politique de sécurité
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première politique de sécurité pour protéger votre système
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une politique
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
