'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, User } from 'lucide-react';

interface ClientCardErrorBoundaryProps {
  children: ReactNode;
  clientId: string;
}

interface ClientCardErrorBoundaryState {
  hasError: boolean;
}

export class ClientCardErrorBoundary extends Component<ClientCardErrorBoundaryProps, ClientCardErrorBoundaryState> {
  constructor(props: ClientCardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ClientCardErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClientCard error:', {
      clientId: this.props.clientId,
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-700/50 rounded-xl p-4 shadow-lg min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <User className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm text-red-300 font-medium">Card Error</p>
            <p className="text-xs text-zinc-400">Unable to display client</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}