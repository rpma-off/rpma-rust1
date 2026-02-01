import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

export function SupplierManagement() {
  return (
    <Card className="bg-border-800 border-border-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Supplier Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-border-300">Supplier management interface coming soon...</p>
      </CardContent>
    </Card>
  );
}