'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Save, X, AlertCircle, CheckCircle, Upload, Palette } from 'lucide-react';
import type { UpdateOrganizationRequest } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/domains/auth';
import { useOrganization, useUpdateOrganization } from '../api/useOrganization';

interface OrganizationFormData {
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  website: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  siret: string;
  tax_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export function OrganizationSettingsTab() {
  const { user } = useAuth();
  const { data: organization, isLoading } = useOrganization(user?.token ?? null);
  const updateOrganizationMutation = useUpdateOrganization(user?.token ?? null);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const form = useForm<OrganizationFormData>({
    defaultValues: {
      name: '',
      legal_name: '',
      email: '',
      phone: '',
      website: '',
      address_street: '',
      address_city: '',
      address_state: '',
      address_zip: '',
      address_country: '',
      siret: '',
      tax_id: '',
      primary_color: '#0d9488',
      secondary_color: '#8b5cf6',
      accent_color: '#f59e0b',
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || '',
        legal_name: organization.legal_name || '',
        email: organization.email || '',
        phone: organization.phone || '',
        website: organization.website || '',
        address_street: organization.address_street || '',
        address_city: organization.address_city || '',
        address_state: organization.address_state || '',
        address_zip: organization.address_zip || '',
        address_country: organization.address_country || '',
        siret: organization.siret || '',
        tax_id: organization.tax_id || '',
        primary_color: organization.primary_color || '#0d9488',
        secondary_color: organization.secondary_color || '#8b5cf6',
        accent_color: organization.accent_color || '#f59e0b',
      });
    }
  }, [organization, form]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (!user?.token || !organization) {
      setSaveError('Session expirée ou organisation non trouvée.');
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);

    const updateData: UpdateOrganizationRequest = {
      name: data.name,
      legal_name: data.legal_name || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      address_street: data.address_street || null,
      address_city: data.address_city || null,
      address_state: data.address_state || null,
      address_zip: data.address_zip || null,
      address_country: data.address_country || null,
      siret: data.siret || null,
      tax_id: data.tax_id || null,
      primary_color: data.primary_color || null,
      secondary_color: data.secondary_color || null,
      accent_color: data.accent_color || null,
      logo_url: null,
      logo_data: null,
      business_settings: null,
      invoice_settings: null,
      industry: null,
      company_size: null,
      slug: null,
      registration_number: null,
    };

    updateOrganizationMutation.mutate(
      updateData,
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
          setSaveError(errorMessage);
        },
      }
    );
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.token || !organization) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveError('La taille du fichier doit être inférieure à 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSaveError('Seuls les fichiers JPEG, PNG, GIF et WebP sont autorisés');
      return;
    }

    setIsUploadingLogo(true);
    setSaveError(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Échec de la lecture du fichier'));
        reader.readAsDataURL(file);
      });

      const updateData: UpdateOrganizationRequest = {
        name: organization.name,
        logo_data: base64Data,
        logo_url: null,
        legal_name: null,
        tax_id: null,
        siret: null,
        registration_number: null,
        email: null,
        phone: null,
        website: null,
        address_street: null,
        address_city: null,
        address_state: null,
        address_zip: null,
        address_country: null,
        primary_color: null,
        secondary_color: null,
        accent_color: null,
        business_settings: null,
        invoice_settings: null,
        industry: null,
        company_size: null,
        slug: null,
      };

      updateOrganizationMutation.mutate(
        updateData,
        {
          onSuccess: () => {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
          },
          onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Échec du téléchargement du logo';
            setSaveError(errorMessage);
          },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Échec du téléchargement du logo';
      setSaveError(errorMessage);
    } finally {
      setIsUploadingLogo(false);
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Aucune organisation trouvée. Veuillez compléter l&apos;onboarding.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Organisation mise à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations de l&apos;organisation
            </CardTitle>
            <CardDescription>
              Gérez les informations de base de votre organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;organisation *</Label>
                <Input
                  id="name"
                  {...form.register('name', { required: true })}
                  placeholder="Nom de l'organisation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal_name">Raison sociale</Label>
                <Input
                  id="legal_name"
                  {...form.register('legal_name')}
                  placeholder="Raison sociale légale"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  {...form.register('siret')}
                  placeholder="123 456 789 00012"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">N° TVA</Label>
                <Input
                  id="tax_id"
                  {...form.register('tax_id')}
                  placeholder="FR12345678901"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="contact@entreprise.fr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  {...form.register('website')}
                  placeholder="https://www.entreprise.fr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
            <CardDescription>
              Adresse principale de l&apos;organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address_street">Rue</Label>
                <Input
                  id="address_street"
                  {...form.register('address_street')}
                  placeholder="123 Rue de la Paix"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_city">Ville</Label>
                <Input
                  id="address_city"
                  {...form.register('address_city')}
                  placeholder="Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_zip">Code postal</Label>
                <Input
                  id="address_zip"
                  {...form.register('address_zip')}
                  placeholder="75001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_state">Région</Label>
                <Input
                  id="address_state"
                  {...form.register('address_state')}
                  placeholder="Île-de-France"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_country">Pays</Label>
                <Input
                  id="address_country"
                  {...form.register('address_country')}
                  placeholder="France"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Logo
            </CardTitle>
            <CardDescription>
              Logo de l&apos;organisation affiché dans l&apos;application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {organization.logo_data ? (
                  <img
                    src={`data:image/png;base64,${organization.logo_data}`}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={isUploadingLogo} asChild>
                    <span className="flex items-center gap-2">
                      {isUploadingLogo ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isUploadingLogo ? 'Téléchargement...' : 'Changer le logo'}
                    </span>
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-sm text-muted-foreground">
                  JPG, PNG ou GIF. Taille max: 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Couleurs de marque
            </CardTitle>
            <CardDescription>
              Personnalisez les couleurs de votre organisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Couleur principale</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    {...form.register('primary_color')}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    {...form.register('primary_color')}
                    placeholder="#0d9488"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Couleur secondaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    {...form.register('secondary_color')}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    {...form.register('secondary_color')}
                    placeholder="#8b5cf6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent_color">Couleur d&apos;accent</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    {...form.register('accent_color')}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    {...form.register('accent_color')}
                    placeholder="#f59e0b"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 pt-6">
          <Button type="submit" disabled={updateOrganizationMutation.isPending} className="flex items-center gap-2">
            {updateOrganizationMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder les modifications
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={updateOrganizationMutation.isPending}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
