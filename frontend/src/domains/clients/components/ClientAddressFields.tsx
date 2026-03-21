'use client';

import { Input } from '@/components/ui/input';
import { useTranslation } from '@/shared/hooks';

interface AddressFormData {
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  address_country?: string | null;
}

interface AddressFormErrors {
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
}

type AddressField = 'address_street' | 'address_city' | 'address_state' | 'address_zip' | 'address_country';

interface ClientAddressFieldsProps {
  formData: AddressFormData;
  formErrors: AddressFormErrors;
  onChange: (field: AddressField, value: string) => void;
}

export function ClientAddressFields({ formData, formErrors, onChange }: ClientAddressFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground border-b border-[hsl(var(--rpma-border))] pb-2">
        {t('clients.address')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="address_street" className="block text-sm font-medium text-muted-foreground">
            {t('clients.streetAddress')}
          </label>
          <Input
            type="text"
            id="address_street"
            value={formData.address_street ?? ''}
            onChange={(e) => onChange('address_street', e.target.value)}
            className={formErrors.address_street ? 'border-destructive focus-visible:ring-destructive' : ''}
            placeholder={t('clients.enterStreetAddress')}
          />
          {formErrors.address_street && <p className="text-destructive text-sm">{formErrors.address_street}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="address_city" className="block text-sm font-medium text-muted-foreground">
            {t('clients.city')}
          </label>
          <Input
            type="text"
            id="address_city"
            value={formData.address_city ?? ''}
            onChange={(e) => onChange('address_city', e.target.value)}
            className={formErrors.address_city ? 'border-destructive focus-visible:ring-destructive' : ''}
            placeholder={t('clients.enterCity')}
          />
          {formErrors.address_city && <p className="text-destructive text-sm">{formErrors.address_city}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label htmlFor="address_state" className="block text-sm font-medium text-muted-foreground">
            {t('clients.stateRegion')}
          </label>
          <Input
            type="text"
            id="address_state"
            value={formData.address_state ?? ''}
            onChange={(e) => onChange('address_state', e.target.value)}
            className={formErrors.address_state ? 'border-destructive focus-visible:ring-destructive' : ''}
            placeholder={t('clients.enterStateRegion')}
          />
          {formErrors.address_state && <p className="text-destructive text-sm">{formErrors.address_state}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="address_zip" className="block text-sm font-medium text-muted-foreground">
            {t('clients.postalCode')}
          </label>
          <Input
            type="text"
            id="address_zip"
            value={formData.address_zip ?? ''}
            onChange={(e) => onChange('address_zip', e.target.value)}
            className={formErrors.address_zip ? 'border-destructive focus-visible:ring-destructive' : ''}
            placeholder={t('clients.enterPostalCode')}
          />
          {formErrors.address_zip && <p className="text-destructive text-sm">{formErrors.address_zip}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="address_country" className="block text-sm font-medium text-muted-foreground">
            {t('clients.country')}
          </label>
          <Input
            type="text"
            id="address_country"
            value={formData.address_country ?? ''}
            onChange={(e) => onChange('address_country', e.target.value)}
            className={formErrors.address_country ? 'border-destructive focus-visible:ring-destructive' : ''}
            placeholder={t('clients.enterCountry')}
          />
          {formErrors.address_country && <p className="text-destructive text-sm">{formErrors.address_country}</p>}
        </div>
      </div>
    </div>
  );
}
