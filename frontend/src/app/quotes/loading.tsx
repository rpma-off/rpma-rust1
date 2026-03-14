import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function QuotesLoading() {
  return (
    <div className="space-y-6" data-testid="quotes-loading">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      <SkeletonTable rows={8} columns={6} />
    </div>
  );
}
