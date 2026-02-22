'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Accessibility,
  Eye,
  Volume2,
  MousePointer,
  Keyboard,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { ipcClient } from '@/lib/ipc';
import { UserSession } from '@/lib/backend';
import { UserAccount } from '@/types';

// Accessibility settings form schema
const accessibilitySchema = z.object({
  high_contrast: z.boolean(),
  large_text: z.boolean(),
  reduce_motion: z.boolean(),
  screen_reader: z.boolean(),
  focus_indicators: z.boolean(),
  keyboard_navigation: z.boolean(),
  text_to_speech: z.boolean(),
  speech_rate: z.number().min(0.5).max(2.0),
  font_size: z.number().min(12).max(24),
  color_blind_mode: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']),
});

type AccessibilityFormData = z.infer<typeof accessibilitySchema>;

interface AccessibilitySettingsTabProps {
  user?: UserSession;
  profile?: UserAccount;
}

export function AccessibilityTab({ user }: AccessibilitySettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { logInfo, logError, logUserAction } = useLogger({
    context: LogDomain.USER,
    component: 'AccessibilityTab',
  });

  const form = useForm<AccessibilityFormData>({
    resolver: zodResolver(accessibilitySchema),
    defaultValues: {
      high_contrast: false,
      large_text: false,
      reduce_motion: false,
      screen_reader: false,
      focus_indicators: true,
      keyboard_navigation: true,
      text_to_speech: false,
      speech_rate: 1.0,
      font_size: 16,
      color_blind_mode: 'none',
    },
  });

  // Load accessibility settings
  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      if (!user?.token) return;

      setIsLoading(true);
      try {
        const userSettings = await ipcClient.settings.getUserSettings(user.token);

        // Apply accessibility settings if available
        if (userSettings?.accessibility) {
          form.reset(userSettings.accessibility as unknown as AccessibilityFormData);
        }

        logInfo('Accessibility settings loaded successfully', { userId: user.user_id });
      } catch (error) {
        logError('Failed to load accessibility settings', {
          error: error instanceof Error ? error.message : error,
          userId: user.user_id
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessibilitySettings();
  }, [user?.token, user?.user_id, form, logInfo, logError]);

  const onSubmit = async (data: AccessibilityFormData) => {
    if (!user?.token) {
      setSaveError('No authentication token available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    logUserAction('Accessibility settings update initiated', {
      changedFields: Object.keys(form.formState.dirtyFields),
      userId: user.user_id
    });

    try {
      await ipcClient.settings.updateUserAccessibility(data, user.token);

      setSaveSuccess(true);
      logInfo('Accessibility settings updated successfully', { userId: user.user_id });

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving accessibility settings';
      setSaveError(errorMessage);
      logError('Accessibility settings update failed', { error: errorMessage, userId: user.user_id });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    form.reset({
      high_contrast: false,
      large_text: false,
      reduce_motion: false,
      screen_reader: false,
      focus_indicators: true,
      keyboard_navigation: true,
      text_to_speech: false,
      speech_rate: 1.0,
      font_size: 16,
      color_blind_mode: 'none',
    });
    logUserAction('Accessibility settings reset to defaults');
  };

  const testTextToSpeech = () => {
    const speechRate = form.getValues('speech_rate');
    const utterance = new SpeechSynthesisUtterance('Ceci est un test de synthèse vocale.');
    utterance.rate = speechRate;
    utterance.lang = 'fr-FR'; // French

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Speak the test text
    window.speechSynthesis.speak(utterance);

    logUserAction('Text-to-speech test initiated', { speechRate });
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
            Paramètres d&apos;accessibilité mis à jour avec succès
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Visual Accessibility Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Accessibilité visuelle
              </CardTitle>
              <CardDescription>
                Options pour améliorer la visibilité et la lisibilité de l&apos;interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="high_contrast"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Contraste élevé</FormLabel>
                        <FormDescription>
                          Augmente le contraste pour une meilleure visibilité
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="large_text"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Texte agrandi</FormLabel>
                        <FormDescription>
                          Augmente la taille du texte dans l&apos;interface
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reduce_motion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Réduire les animations</FormLabel>
                        <FormDescription>
                          Désactive les animations pour éviter les distractions
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="focus_indicators"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Indicateurs de focus</FormLabel>
                        <FormDescription>
                          Affiche des indicateurs visuels pour la navigation au clavier
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="font_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taille de police</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(Math.max(12, field.value - 1))}
                          disabled={field.value <= 12}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[60px] text-center font-medium">{field.value}px</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(Math.min(24, field.value + 1))}
                          disabled={field.value >= 24}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Ajustez la taille de la police pour une meilleure lisibilité (12-24px)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color_blind_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode daltonien</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        <SelectItem value="protanopia">Protanopie (rouge-vert)</SelectItem>
                        <SelectItem value="deuteranopia">Deutéranopie (vert-rouge)</SelectItem>
                        <SelectItem value="tritanopia">Tritanopie (bleu-jaune)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Adapte les couleurs pour les personnes daltoniennes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Motor and Interaction Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer className="h-5 w-5" />
                Interaction et motricité
              </CardTitle>
               <CardDescription>
                 Options pour faciliter l&apos;interaction avec l&apos;interface
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="keyboard_navigation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Navigation au clavier</FormLabel>
                      <FormDescription>
                        Active la navigation complète au clavier (Tab, flèches, etc.)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="screen_reader"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Optimisations lecteur d&apos;écran</FormLabel>
                      <FormDescription>
                        Améliore la compatibilité avec les lecteurs d&apos;écran
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Audio Accessibility Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Accessibilité audio
              </CardTitle>
               <CardDescription>
                 Options pour l&apos;accessibilité auditive et la synthèse vocale
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="text_to_speech"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Synthèse vocale</FormLabel>
                      <FormDescription>
                        Active la synthèse vocale pour lire le contenu à haute voix
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="speech_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vitesse de synthèse</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(Math.max(0.5, field.value - 0.1))}
                          disabled={field.value <= 0.5}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[60px] text-center font-medium">{field.value}x</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(Math.min(2.0, field.value + 0.1))}
                          disabled={field.value >= 2.0}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Ajustez la vitesse de la synthèse vocale (0.5x - 2.0x)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                onClick={testTextToSpeech}
                className="flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Tester la synthèse vocale
              </Button>
            </CardContent>
          </Card>

          {/* Accessibility Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Conformité et recommandations
              </CardTitle>
               <CardDescription>
                 Informations sur la conformité aux standards d&apos;accessibilité
               </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">WCAG 2.1 AA</p>
                     <p className="text-sm text-muted-foreground">
                       L&apos;application respecte les guidelines WCAG 2.1 niveau AA pour l&apos;accessibilité web
                     </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Keyboard className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Navigation au clavier</p>
                    <p className="text-sm text-muted-foreground">
                      Tous les éléments interactifs sont accessibles via le clavier
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Monitor className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Lecteurs d&apos;écran</p>
                     <p className="text-sm text-muted-foreground">
                       Compatible avec les principaux lecteurs d&apos;écran (NVDA, JAWS, VoiceOver)
                     </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-6 border-t">
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder les paramètres
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetToDefaults}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser aux valeurs par défaut
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
