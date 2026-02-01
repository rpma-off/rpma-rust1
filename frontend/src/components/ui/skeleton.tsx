import { cn } from "@/lib/utils"
import React from "react"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-gradient-to-r from-border/10 via-border/20 to-border/10 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  showAvatar = false,
  showActions = false,
  className = ''
}) => (
  <div className={cn("bg-muted/30 rounded-xl p-6 border border-border/20 animate-in fade-in-0 duration-300", className)}>
    <div className="flex items-start gap-4">
      {showAvatar && (
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0 animate-in slide-in-from-left-2 duration-300 delay-100" />
      )}
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4 animate-in slide-in-from-top-2 duration-300 delay-150" />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-3 animate-in slide-in-from-top-2 duration-300 ${i === lines - 1 ? 'w-1/2' : 'w-full'}`}
              style={{ animationDelay: `${200 + i * 50}ms` }}
            />
          ))}
        </div>
        {showActions && (
          <div className="flex gap-2 pt-2 animate-in slide-in-from-bottom-2 duration-300 delay-300">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        )}
      </div>
    </div>
  </div>
);

interface SkeletonListProps {
  count?: number;
  itemComponent?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemComponent: ItemComponent = SkeletonCard,
  className = ''
}) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <ItemComponent key={i} />
    ))}
  </div>
);

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={cn("space-y-3", className)}>
    {/* Header */}
    <div className="flex gap-4 pb-3 border-b border-border/20">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            className={`h-4 ${colIndex === 0 ? 'flex-1' : 'w-24'}`}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = ''
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

// Context-aware skeleton components
export const TaskCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn("bg-muted/30 rounded-xl p-6 border border-border/20 animate-in fade-in-0 duration-300", className)}>
    <div className="flex items-start gap-4">
      {/* Avatar/Icon */}
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0 animate-in slide-in-from-left-2 duration-300 delay-100" />

      <div className="flex-1 space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-3/4 animate-in slide-in-from-top-2 duration-300 delay-150" />

        {/* Status badge */}
        <Skeleton className="h-5 w-20 rounded-full animate-in slide-in-from-top-2 duration-300 delay-200" />

        {/* Info rows */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full animate-in slide-in-from-top-2 duration-300 delay-250" />
          <Skeleton className="h-4 w-2/3 animate-in slide-in-from-top-2 duration-300 delay-300" />
          <Skeleton className="h-4 w-1/2 animate-in slide-in-from-top-2 duration-300 delay-350" />
        </div>

        {/* Progress bar */}
        <Skeleton className="h-2 w-full rounded-full animate-in slide-in-from-bottom-2 duration-300 delay-400" />

        {/* Actions */}
        <div className="flex gap-2 pt-2 animate-in slide-in-from-bottom-2 duration-300 delay-450">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  </div>
);

export const ClientCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn("bg-muted/30 rounded-xl p-6 border border-border/20 animate-in fade-in-0 duration-300", className)}>
    <div className="flex items-start gap-4">
      {/* Avatar/Icon */}
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0 animate-in slide-in-from-left-2 duration-300 delay-100" />

      <div className="flex-1 space-y-3">
        {/* Name */}
        <Skeleton className="h-6 w-2/3 animate-in slide-in-from-top-2 duration-300 delay-150" />

        {/* Company */}
        <Skeleton className="h-4 w-1/2 animate-in slide-in-from-top-2 duration-300 delay-200" />

        {/* Contact info */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full animate-in slide-in-from-top-2 duration-300 delay-250" />
          <Skeleton className="h-4 w-3/4 animate-in slide-in-from-top-2 duration-300 delay-300" />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 animate-in slide-in-from-bottom-2 duration-300 delay-350">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

export const ReportCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn("bg-muted/30 rounded-xl p-6 border border-border/20 animate-in fade-in-0 duration-300", className)}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg animate-in slide-in-from-left-2 duration-300 delay-100" />
        <Skeleton className="h-6 w-1/2 animate-in slide-in-from-top-2 duration-300 delay-150" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 animate-in slide-in-from-top-2 duration-300 delay-200" />
          <Skeleton className="h-8 w-20 animate-in slide-in-from-top-2 duration-300 delay-250" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 animate-in slide-in-from-top-2 duration-300 delay-300" />
          <Skeleton className="h-8 w-20 animate-in slide-in-from-top-2 duration-300 delay-350" />
        </div>
      </div>

      {/* Chart placeholder */}
      <Skeleton className="h-32 w-full rounded-lg animate-in slide-in-from-bottom-2 duration-300 delay-400" />
    </div>
  </div>
);

export { Skeleton }
