'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PPFWorkflowProvider } from '@/domains/interventions';

interface PPFWorkflowLayoutProps {
  children: React.ReactNode;
}

export default function PPFWorkflowLayout({ children }: PPFWorkflowLayoutProps) {
  const params = useParams();
  const taskId = params.id as string;

  return <PPFWorkflowProvider taskId={taskId}>{children}</PPFWorkflowProvider>;
}
