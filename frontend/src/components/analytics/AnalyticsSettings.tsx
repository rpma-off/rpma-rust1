import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function AnalyticsSettings() {
  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analytics Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Analytics configuration and settings coming soon...</p>
      </CardContent>
    </Card>
  );
}
