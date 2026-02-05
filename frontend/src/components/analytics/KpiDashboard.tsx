import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export function KpiDashboard() {
  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Target className="w-5 h-5" />
            KPI Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">KPI tracking and management interface coming soon...</p>
      </CardContent>
    </Card>
  );
}
