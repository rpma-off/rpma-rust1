import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export function AnalyticsReports() {
  return (
    <Card className="bg-border-800 border-border-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Analytics Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-border-300">Advanced analytics reports coming soon...</p>
      </CardContent>
    </Card>
  );
}