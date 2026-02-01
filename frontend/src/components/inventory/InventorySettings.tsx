import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function InventorySettings() {
  return (
    <Card className="bg-border-800 border-border-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Inventory Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-border-300">Inventory settings coming soon...</p>
      </CardContent>
    </Card>
  );
}