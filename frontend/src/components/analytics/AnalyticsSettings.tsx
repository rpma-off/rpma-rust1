import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function AnalyticsSettings() {
  return (
    <Card className="bg-border-800 border-border-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analytics Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-border-300">Analytics configuration and settings coming soon...</p>
      </CardContent>
    </Card>
  );
}