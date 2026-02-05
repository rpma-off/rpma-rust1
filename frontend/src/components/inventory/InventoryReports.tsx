import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function InventoryReports() {
  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Inventory Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Inventory reporting interface coming soon...</p>
      </CardContent>
    </Card>
  );
}
