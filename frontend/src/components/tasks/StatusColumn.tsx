import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusColumnProps {
  title: string;
  count: number;
  color: string;
  isDraggingOver: boolean;
  children: React.ReactNode;
}

export const StatusColumn = forwardRef<HTMLDivElement, StatusColumnProps>(
  ({ title, count, color, isDraggingOver, children }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'flex flex-col h-full',
          isDraggingOver && 'ring-2 ring-primary ring-opacity-50'
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', color)} />
              {title}
            </div>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {children}
        </CardContent>
      </Card>
    );
  }
);

StatusColumn.displayName = 'StatusColumn';