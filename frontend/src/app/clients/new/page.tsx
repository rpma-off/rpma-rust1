'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/compatibility';
import { clientService } from '@/lib/services/entities/client.service';
import { ArrowLeft, Save, X, UserPlus, Building, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CreateClientDTO } from '@/types/client.types';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateClientDTO>({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    company_name: '',
    customer_type: 'individual',
    notes: ''
  });
  const [errors, setErrors] = useState<Partial<CreateClientDTO & { general?: string }>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a client');
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      if (!user?.id) {
        setErrors({ general: 'Authentication required' });
        return;
      }

      const response = await clientService.createClient(formData, user.token);
      if (response.error) {
        setErrors({ general: response.error });
        return;
      }

      if (response.data) {
        router.push(`/clients/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  const handleInputChange = (field: keyof CreateClientDTO, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="rpma-shell p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link
              href="/clients"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Clients</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600/20 rounded-full">
                <UserPlus className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">New Client</h1>
                <p className="text-muted-foreground mt-1">Add a new client to the system</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <p className="text-red-400 text-sm font-medium">{errors.general}</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                Client Name *
              </label>
              <Input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder="Enter client name"
                required
              />
              {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
            </div>

            {/* Customer Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">
                Customer Type *
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer_type"
                    value="individual"
                    checked={formData.customer_type === 'individual'}
                    onChange={(e) => handleInputChange('customer_type', e.target.value as 'individual' | 'business')}
                    className="w-4 h-4 text-green-600 bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Individual</span>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer_type"
                    value="business"
                    checked={formData.customer_type === 'business'}
                    onChange={(e) => handleInputChange('customer_type', e.target.value as 'individual' | 'business')}
                    className="w-4 h-4 text-green-600 bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Business</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                Email Address
              </label>
              <Input
                type="email"
                id="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                Phone Number
              </label>
              <Input
                type="tel"
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder="Enter phone number"
              />
              {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label htmlFor="address_street" className="block text-sm font-medium text-muted-foreground">
                Address
              </label>
              <Textarea
                id="address_street"
                value={formData.address_street || ''}
                onChange={(e) => handleInputChange('address_street', e.target.value)}
                className={errors.address_street ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder="Enter full address"
                rows={3}
              />
              {errors.address_street && <p className="text-red-400 text-sm">{errors.address_street}</p>}
            </div>

            {/* Company Name (only for business) */}
            {formData.customer_type === 'business' && (
              <div className="space-y-2">
                <label htmlFor="company_name" className="block text-sm font-medium text-muted-foreground">
                  Company Name
                </label>
                <Input
                  type="text"
                  id="company_name"
                  value={formData.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className={errors.company_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  placeholder="Enter company name"
                />
                {errors.company_name && <p className="text-red-400 text-sm">{errors.company_name}</p>}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                Additional Notes
              </label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className={errors.notes ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder="Enter any additional notes about the client"
                rows={4}
              />
              {errors.notes && <p className="text-red-400 text-sm">{errors.notes}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-8 border-t border-[hsl(var(--rpma-border))]">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{loading ? 'Creating...' : 'Create Client'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
