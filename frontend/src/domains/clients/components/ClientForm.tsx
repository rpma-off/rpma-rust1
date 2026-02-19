'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  FileText,
  Save,
  X
} from 'lucide-react';
import { Client } from '@/lib/backend';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: Partial<Client>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

// Validation schema
const clientFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  address_country: z.string().optional(),
  company_name: z.string().optional(),
  customer_type: z.enum(['individual', 'business']).default('individual'),
  notes: z.string().optional()
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export function ClientForm({
  client,
  loading = false,
  onSubmit,
  onCancel,
  mode = 'create'
}: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address_street: client?.address_street || '',
      address_city: client?.address_city || '',
      address_state: client?.address_state || '',
      address_zip: client?.address_zip || '',
      address_country: client?.address_country || '',
      company_name: client?.company_name || '',
      customer_type: (client?.customer_type && client.customer_type !== null && (client.customer_type === 'individual' || client.customer_type === 'business')) ? client.customer_type as 'individual' | 'business' : 'individual',
      notes: client?.notes || ''
    },
    mode: 'onChange'
  });

  // Update form when client changes
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address_street: client.address_street || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
        address_zip: client.address_zip || '',
        address_country: client.address_country || '',
        company_name: client.company_name || '',
        customer_type: (client.customer_type && client.customer_type !== null && (client.customer_type === 'individual' || client.customer_type === 'business')) ? client.customer_type as 'individual' | 'business' : 'individual',
        notes: client.notes || ''
      });
    }
  }, [client, form]);

  const handleSubmit = async (data: ClientFormData): Promise<void> => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await onSubmit(data);
      } else {
        await onSubmit({ id: client!.id, ...data });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {mode === 'create' ? 'Nouveau client' : 'Modifier le client'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations de base</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nom complet *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de client</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Particulier</SelectItem>
                          <SelectItem value="business">Entreprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Nom de l&apos;entreprise
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'entreprise (optionnel)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations de contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="jean@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+33123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                   control={form.control}
                   name="address_street"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="flex items-center gap-2">
                         <MapPin className="h-4 w-4" />
                         Rue
                       </FormLabel>
                       <FormControl>
                         <Input placeholder="123 Rue de la Paix" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={form.control}
                   name="address_city"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Ville</FormLabel>
                       <FormControl>
                         <Input placeholder="Paris" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                   control={form.control}
                   name="address_state"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Région</FormLabel>
                       <FormControl>
                         <Input placeholder="Île-de-France" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={form.control}
                   name="address_zip"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Code postal</FormLabel>
                       <FormControl>
                         <Input placeholder="75001" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={form.control}
                   name="address_country"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Pays</FormLabel>
                       <FormControl>
                         <Input placeholder="France" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
               </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notes</h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes supplémentaires sur le client..."
                        className="min-h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting || loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'create' ? 'Créer' : 'Enregistrer'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
