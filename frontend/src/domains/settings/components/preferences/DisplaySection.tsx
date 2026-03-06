'use client';

import React from 'react';
import type { Control } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Moon, Sun, Languages } from 'lucide-react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { PreferencesFormData } from '../../hooks/usePreferencesForm';

interface DisplaySectionProps {
  control: Control<PreferencesFormData>;
}

export function DisplaySection({ control }: DisplaySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Affichage
        </CardTitle>
        <CardDescription>
          Personnalisez l&apos;apparence et le comportement de l&apos;interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="preferences.theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thème</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un thème" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Clair
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Sombre
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Système
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choisissez le thème d&apos;affichage de l&apos;application
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="preferences.language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Langue</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fr">
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Français
                      </div>
                    </SelectItem>
                    <SelectItem value="en">
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Anglais
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Langue d&apos;affichage de l&apos;interface
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="preferences.date_format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format de date</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Format de date" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">31/12/2023</SelectItem>
                    <SelectItem value="MM/DD/YYYY">12/31/2023</SelectItem>
                    <SelectItem value="YYYY-MM-DD">2023-12-31</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Format d&apos;affichage des dates dans l&apos;application
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="preferences.time_format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format d&apos;heure</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Format d&apos;heure" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="24h">24 heures (14:30)</SelectItem>
                    <SelectItem value="12h">12 heures (2:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Format d&apos;affichage des heures
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
