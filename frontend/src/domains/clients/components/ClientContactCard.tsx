'use client';

import { Mail, Phone, MapPin, Building2 } from 'lucide-react';
import type { ClientWithTasks } from '@/lib/backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/shared/hooks';

interface ClientContactCardProps {
  client: ClientWithTasks;
}

export function ClientContactCard({ client }: ClientContactCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('clients.contactInformation')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {client.email && (
            <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.email')}</p>
                <p className="text-foreground font-medium">{client.email}</p>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.phone')}</p>
                <p className="text-foreground font-medium">{client.phone}</p>
              </div>
            </div>
          )}
          {client.company_name && (
            <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.company')}</p>
                <p className="text-foreground font-medium">{client.company_name}</p>
              </div>
            </div>
          )}
          {(client.address_street || client.address_city) && (
            <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.address')}</p>
                <p className="text-foreground font-medium">
                  {[client.address_street, client.address_city, client.address_zip, client.address_country]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
