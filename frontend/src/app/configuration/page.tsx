'use client';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ConfigurationPageContent } from '@/domains/admin';

export default function ConfigurationPage() {
  return <ErrorBoundary><ConfigurationPageContent /></ErrorBoundary>;
}
