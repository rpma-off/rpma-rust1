import React from 'react';
import { useEntitySyncStatus } from '@/domains/sync';
import { EntityType } from '@/lib/backend';
import { cn } from '@/lib/utils';

interface EntitySyncIndicatorProps {
  entityId: string;
  entityType: EntityType;
  className?: string;
}

export function EntitySyncIndicator({ entityId, entityType, className }: EntitySyncIndicatorProps) {
  const entityStatus = useEntitySyncStatus(entityId, entityType);

  if (!entityStatus) {
    return null; // No pending operations for this entity
  }

  const { status, error } = entityStatus;

  const statusConfig = {
    synced: { color: 'text-green-600', icon: '✓', bg: 'bg-green-500', animate: false },
    pending: { color: 'text-blue-600', icon: '⏳', bg: 'bg-blue-500', animate: false },
    syncing: { color: 'text-blue-600', icon: '⟳', bg: 'bg-blue-500', animate: true },
    error: { color: 'text-red-600', icon: '✗', bg: 'bg-red-500', animate: false },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-1", config.color, className)}>
      <div className={cn(
        "w-3 h-3 rounded-full flex items-center justify-center",
        config.bg,
        config.animate && "animate-pulse"
      )}>
        <span className="text-white text-xs">{config.icon}</span>
      </div>
      {error && (
        <span className="text-xs text-red-500 ml-1" title={error}>
          Error
        </span>
      )}
    </div>
  );
}