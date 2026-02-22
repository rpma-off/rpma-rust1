'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, Users, Package, FileText, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      icon: Plus,
      label: 'Nouvelle tâche',
      description: 'Créer une nouvelle tâche',
      onClick: () => router.push('/tasks/new'),
    },
    {
      icon: Calendar,
      label: 'Voir calendrier',
      description: 'Afficher le calendrier',
      onClick: () => router.push('/calendar'),
    },
    {
      icon: Users,
      label: 'Nouveau client',
      description: 'Ajouter un client',
      onClick: () => router.push('/clients/new'),
    },
    {
      icon: Package,
      label: 'Gérer stock',
      description: 'Gérer l\'inventaire',
      onClick: () => router.push('/inventory'),
    },
    {
      icon: FileText,
      label: 'Créer un devis',
      description: 'Nouveau devis client',
      onClick: () => router.push('/quotes/new'),
    },
    {
      icon: Settings,
      label: 'Paramètres',
      description: 'Configuration',
      onClick: () => router.push('/settings'),
    },
  ];

  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle>Actions rapides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 h-auto py-4 px-3"
            >
              <action.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
