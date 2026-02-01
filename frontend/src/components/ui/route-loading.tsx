import { Loader2 } from 'lucide-react';

interface RouteLoadingProps {
  message?: string;
  className?: string;
}

export function RouteLoading({ message = 'Chargement...', className = '' }: RouteLoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[200px] ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}