'use client';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { TasksPageContent } from '@/domains/tasks';

export default function TasksPage() {
  return <ErrorBoundary><TasksPageContent /></ErrorBoundary>;
}
