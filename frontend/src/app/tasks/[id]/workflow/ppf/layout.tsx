import { PPFWorkflowProvider } from '@/domains/interventions/api/PPFWorkflowProvider';

interface PPFWorkflowLayoutProps {
  children: React.ReactNode;
  params:
    | {
        id: string;
      }
    | Promise<{
        id: string;
      }>;
}

export default async function PPFWorkflowLayout({ children, params }: PPFWorkflowLayoutProps) {
  const { id } = await params;
  return <PPFWorkflowProvider taskId={id}>{children}</PPFWorkflowProvider>;
}
