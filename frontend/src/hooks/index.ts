// Dashboard hooks
export { useDashboardStats } from '@/domains/analytics';
export { useTaskFiltering } from '@/domains/tasks';

// Performance optimization hooks (migrated to shared/domains)
export { useVirtualScrolling, useTaskVirtualScrolling, useSOPVirtualScrolling, useUserVirtualScrolling } from '@/shared/hooks/useVirtualScrolling';
export { usePerformanceMonitor, useDashboardPerformanceMonitor, useOperationTimer, useAPIPerformanceMonitor } from '@/domains/analytics/hooks/usePerformanceMonitor';
export { useIntersectionObserver, useLazyImage, useLazyComponent, useInfiniteScroll, useScrollAnimation } from '@/shared/hooks/useIntersectionObserver';

// Sprint 3: Advanced Dashboard Features (migrated to domains)
export { useRealTimeUpdates, useDashboardRealTime, useTaskRealTime, useSOPRealTime } from '@/domains/sync/hooks/useRealTimeUpdates';
export { useAdvancedAnalytics, useDashboardAnalytics, useTaskAnalytics, useSOPAnalytics, useUserAnalytics } from '@/domains/analytics/hooks/useAdvancedAnalytics';
// Dashboard customization feature removed - using unified layout system
export { useAdvancedFiltering, useTaskFiltering as useAdvancedTaskFiltering, useSOPFiltering as useAdvancedSOPFiltering } from '@/shared/hooks/useAdvancedFiltering';

// Existing hooks
export { useChangeTracking } from '@/domains/audit';
export * from '@/domains/sync/hooks/useConnectionStatus';
export * from './useDebounce';
