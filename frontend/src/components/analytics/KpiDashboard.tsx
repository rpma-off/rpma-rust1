import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export function KpiDashboard() {
  return (
    <Card className="bg-border-800 border-border-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Target className="w-5 h-5" />
            KPI Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-border-300">KPI tracking and management interface coming soon...</p>
      </CardContent>
    </Card>
  );
}