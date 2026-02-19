'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Building, TrendingUp } from 'lucide-react';

interface ClientStats {
  total?: number;
  active?: number;
}

interface UserStats {
  total?: number;
  active?: number;
  admins?: number;
  technicians?: number;
}

export interface QualityAssuranceDashboardProps {
  clientStats?: ClientStats;
  userStats?: UserStats;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
}

/**
 * Quality assurance dashboard component
 * Displays QA metrics and control data
 */
export function QualityAssuranceDashboard({ clientStats, userStats }: QualityAssuranceDashboardProps) {
  const totalClients = clientStats?.total || 0;
  const activeClients = clientStats?.active || 0;
  const totalUsers = userStats?.total || 0;
  const activeUsers = userStats?.active || 0;
  const admins = userStats?.admins || 0;
  const technicians = userStats?.technicians || 0;

  const clientActivityRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
  const userActivityRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const stats = [
    {
      label: 'Total Clients',
      value: totalClients,
      subtitle: `${activeClients} actifs`,
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: clientActivityRate,
    },
    {
      label: 'Total Utilisateurs',
      value: totalUsers,
      subtitle: `${activeUsers} actifs`,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: userActivityRate,
    },
    {
      label: 'Administrateurs',
      value: admins,
      subtitle: 'Comptes admin',
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: null,
    },
    {
      label: 'Techniciens',
      value: technicians,
      subtitle: 'Équipe terrain',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Assurance Qualité
          <Badge variant="secondary" className="text-xs">
            Système opérationnel
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center space-x-3 p-3 rounded-lg border">
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  {stat.trend !== null && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {stat.trend}% actif
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quality Metrics */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Métriques de Qualité</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{userActivityRate}%</div>
                <div className="text-xs text-green-700">Taux d&apos;activité utilisateurs</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{clientActivityRate}%</div>
                <div className="text-xs text-blue-700">Taux d&apos;activité clients</div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">État du Système</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {totalUsers} utilisateurs enregistrés dans le système</p>
              <p>• {totalClients} clients actifs dans la base de données</p>
              <p>• {technicians} techniciens opérationnels sur le terrain</p>
              <p>• {admins} administrateurs pour la gestion système</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}