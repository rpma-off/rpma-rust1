import { Loader2 } from 'lucide-react';

export function RouteLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/50 dark:bg-background/50 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement en cours...</p>
      </div>
    </div>
  );
}
