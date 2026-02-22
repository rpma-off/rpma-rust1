import { Skeleton } from '@/shared/ui/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-skeleton">
      <div className="fixed left-0 top-0 z-40 hidden h-full w-64 border-r bg-card lg:block">
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-32" />
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>

      <div className="lg:pl-64">
        <div className="border-b bg-card px-4 py-4 lg:px-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>

        <main className="space-y-4 p-4 lg:p-6">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </main>
      </div>
    </div>
  );
}
