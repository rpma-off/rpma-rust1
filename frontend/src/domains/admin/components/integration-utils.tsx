'use client';

import React from 'react';
import {
  Globe,
  Mail,
  MessageSquare,
  Calendar,
  Webhook,
  Database,
  Cloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { IntegrationType, IntegrationStatus } from '@/shared/types';

export function getIntegrationTypeLabel(type: IntegrationType): string {
  const labels: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    calendar: 'Calendrier',
    webhook: 'Webhook',
    api: 'API',
    backup: 'Sauvegarde',
    sync: 'Synchronisation',
  };
  return labels[type] || type;
}

export function getIntegrationTypeIcon(type: IntegrationType): React.ReactNode {
  switch (type) {
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'sms':
      return <MessageSquare className="h-4 w-4" />;
    case 'calendar':
      return <Calendar className="h-4 w-4" />;
    case 'webhook':
      return <Webhook className="h-4 w-4" />;
    case 'api':
      return <Globe className="h-4 w-4" />;
    case 'backup':
      return <Database className="h-4 w-4" />;
    case 'sync':
      return <Cloud className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

export function getStatusColor(status: IntegrationStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'testing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getHealthStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'unhealthy':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'unknown':
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-600" />;
  }
}
