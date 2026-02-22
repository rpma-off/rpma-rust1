import { Skeleton, SkeletonTable } from '@/shared/ui/ui/skeleton';

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <SkeletonTable rows={6} columns={5} />
    </div>
  );
}
