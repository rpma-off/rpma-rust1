'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Camera, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';
import {
  updateProfileRequestSchema,
  UpdateProfileRequestValidation
} from '@/lib/validation/settings-schemas';
import { SettingsErrorHandler } from '@/lib/utils/settings-error-handler';

type ProfileFormData = UpdateProfileRequestValidation;

interface ProfileSettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function ProfileSettingsTab({ user, profile }: ProfileSettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<any>(null);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'ProfileSettingsTab',
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: {
      full_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() :
                  user ? `${user.username}` : '',
      phone: profile?.phone || '',
    },
  });

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user?.token) return;

      try {
        const settings = await ipcClient.settings.getUserSettings(user.token);
        setUserSettings(settings);
        logInfo('User settings loaded', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load user settings', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
      }
    };

    loadUserSettings();
  }, [user?.token, user?.user_id, logInfo, logError]);

  // Update form when profile data changes
  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone || '',
      });
      logInfo('Profile form initialized', { userId: profile.id });
    }
  }, [profile, form, logInfo]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.token) {
      setSaveError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Profile update initiated', {
      fields: Object.keys(data),
      userId: user.user_id
    });

    try {
      // Validate data with Zod schema
      const validatedData = updateProfileRequestSchema.parse(data);
      // Prepare profile data including avatar_url from current settings
      const profileData = {
        full_name: validatedData.full_name,
        phone: validatedData.phone,
        avatar_url: userSettings?.profile?.avatar_url || null,
      };

      await ipcClient.settings.updateUserProfile(profileData, user.token);

      setSaveSuccess(true);
      logInfo('Profile updated successfully', {
        userId: user.user_id,
        updatedFields: Object.keys(data)
      });

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      // Handle validation errors
      if (error instanceof Error && 'issues' in error) {
        const validationErrors = SettingsErrorHandler.handleValidationError(error as any);
        const errorMessage = validationErrors.map(err => err.message).join(' ');
        setSaveError(errorMessage);
        logError('Profile validation failed', {
          validationErrors,
          userId: user.user_id,
          fields: Object.keys(data)
        });
        return;
      }

      // Handle API errors
      const settingsError = SettingsErrorHandler.handleApiError(error, 'profile_update');
      setSaveError(settingsError.message);
      logError('Profile update failed', {
        error: settingsError,
        userId: user.user_id,
        fields: Object.keys(data),
        retryable: SettingsErrorHandler.isRetryableError(settingsError)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.token) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSaveError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setIsUploadingAvatar(true);
    setSaveError(null);

    logUserAction('Avatar upload initiated', { fileName: file.name, fileSize: file.size, fileType: file.type });

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Upload avatar via IPC
      const avatarUrl = await ipcClient.settings.uploadUserAvatar(
        base64Data,
        file.name,
        file.type,
        user.token
      );

      logInfo('Avatar uploaded successfully', { userId: user.user_id, avatarUrl });

      // Clear the file input
      event.target.value = '';

      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      setSaveError(errorMessage);
      logError('Avatar upload failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Profil mis à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations du Profil
          </CardTitle>
          <CardDescription>
            Gérez vos informations personnelles et vos préférences de contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userSettings?.profile?.avatar_url || undefined} alt={`${profile?.first_name} ${profile?.last_name}`} />
              <AvatarFallback className="text-lg">
                {`${profile?.first_name} ${profile?.last_name}`.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
               <Label htmlFor="avatar-upload" className="cursor-pointer">
                 <Button variant="outline" size="sm" disabled={isUploadingAvatar} asChild>
                   <span className="flex items-center gap-2">
                     {isUploadingAvatar ? (
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                     ) : (
                       <Camera className="h-4 w-4" />
                     )}
                     {isUploadingAvatar ? 'Téléchargement...' : 'Changer la photo'}
                   </span>
                 </Button>
               </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <p className="text-sm text-muted-foreground">
                JPG, PNG ou GIF. Taille maximale: 5MB
              </p>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Votre nom complet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 XX XX XX XX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optionnel - utilisé pour les urgences et les rappels
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />



              {/* Account Info Display */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Informations du compte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <Label className="text-sm text-muted-foreground">Role</Label>
                     <div className="flex items-center gap-2">
                       <Badge variant="secondary">{profile?.role || user?.role || 'technician'}</Badge>
                     </div>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-sm text-muted-foreground">Last login</Label>
                     <p className="text-sm">
                        {profile?.last_login ? new Date(profile.last_login as string).toLocaleString('en-US') : 'Never'}
                     </p>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-sm text-muted-foreground">Login count</Label>
                     <p className="text-sm">{profile?.login_count || 0}</p>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-sm text-muted-foreground">Member since</Label>
                     <p className="text-sm">
                       {profile?.created_at ? new Date(profile.created_at as string).toLocaleDateString('en-US') : 'N/A'}
                     </p>
                   </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-6 border-t">
                <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                  {isSaving ? (
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
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}