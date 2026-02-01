import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function TrendAnalysis() {
  return (
    <Card className="bg-border-800 border-border-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-border-300">Trend analysis and forecasting coming soon...</p>
      </CardContent>
    </Card>
  );
}