// Dashboard hooks
export { useDashboardStats } from './useDashboardStats';
export { useTaskFiltering } from './useTaskFiltering';

// Performance optimization hooks
export { useVirtualScrolling, useTaskVirtualScrolling, useSOPVirtualScrolling, useUserVirtualScrolling } from './useVirtualScrolling';
export { usePerformanceMonitor, useDashboardPerformanceMonitor, useOperationTimer, useAPIPerformanceMonitor } from './usePerformanceMonitor';
export { useIntersectionObserver, useLazyImage, useLazyComponent, useInfiniteScroll, useScrollAnimation } from './useIntersectionObserver';

// Sprint 3: Advanced Dashboard Features
export { useRealTimeUpdates, useDashboardRealTime, useTaskRealTime, useSOPRealTime } from './useRealTimeUpdates';
export { useAdvancedAnalytics, useDashboardAnalytics, useTaskAnalytics, useSOPAnalytics, useUserAnalytics } from './useAdvancedAnalytics';
// Dashboard customization feature removed - using unified layout system
export { useAdvancedFiltering, useTaskFiltering as useAdvancedTaskFiltering, useSOPFiltering as useAdvancedSOPFiltering } from './useAdvancedFiltering';

// Existing hooks
export * from './useChangeTracking';
export * from './useConnectionStatus';
export * from './useDebounce';
