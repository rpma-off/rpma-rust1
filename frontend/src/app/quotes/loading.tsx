import { Skeleton, SkeletonTable } from '@/shared/ui/ui/skeleton';

export default function QuotesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}
