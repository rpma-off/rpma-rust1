import { PPFWorkflowProvider } from '@/domains/interventions';

interface PPFWorkflowLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

export default function PPFWorkflowLayout({ children, params }: PPFWorkflowLayoutProps) {
  return <PPFWorkflowProvider taskId={params.id}>{children}</PPFWorkflowProvider>;
}
