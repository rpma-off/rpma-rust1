'use client';

import React from 'react';
import type { Control } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Accessibility } from 'lucide-react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import type { PreferencesFormData } from '../../hooks/usePreferencesForm';

interface AccessibilitySectionProps {
  control: Control<PreferencesFormData>;
}

export function AccessibilitySection({ control }: AccessibilitySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Accessibilité
        </CardTitle>
        <CardDescription>
          Options d&apos;accessibilité pour améliorer l&apos;utilisation de l&apos;application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="accessibility.high_contrast"
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
            control={control}
            name="accessibility.large_text"
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
            control={control}
            name="accessibility.reduce_motion"
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
            control={control}
            name="accessibility.screen_reader"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Lecteur d&apos;écran</FormLabel>
                  <FormDescription>
                    Optimisations pour les lecteurs d&apos;écran
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
      </CardContent>
    </Card>
  );
}
