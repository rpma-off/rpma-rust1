import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend: 'up' | 'down' | 'neutral';
  description?: string;
  className?: string;
}

export function KpiCard({ title, value, icon, trend, description, className }: KpiCardProps) {
  const trendIcon = {
    up: <TrendingUp className="w-4 h-4 text-[hsl(var(--rpma-teal))]" />,
    down: <TrendingDown className="w-4 h-4 text-red-500" />,
    neutral: <Minus className="w-4 h-4 text-muted-foreground" />,
  };

  const _trendColor = {
    up: 'text-[hsl(var(--rpma-teal))]',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className={cn("rpma-shell", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-blue-500">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          {trendIcon[trend]}
        </div>
      </CardContent>
    </Card>
  );
}
