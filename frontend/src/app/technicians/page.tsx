'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/compatibility';
import { ipcClient } from '@/lib/ipc';
import type { UserAccount as BackendUserAccount } from '@/lib/backend';
import type { UserAccount as UiUserAccount } from '@/lib/types';
import { convertTimestamps } from '@/lib/types';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { EmptyState } from '@/components/layout/EmptyState';

interface TechnicianStats {
  totalTechnicians: number;
  activeTechnicians: number;
  tasksCompletedToday: number;
  averageTasksPerTechnician: number;
}

export default function TechniciansPage() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<UiUserAccount[]>([]);
  const [stats, setStats] = useState<TechnicianStats>({
    totalTechnicians: 0,
    activeTechnicians: 0,
    tasksCompletedToday: 0,
    averageTasksPerTechnician: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!user?.token) return;

      try {
        setLoading(true);

        // Fetch all users and filter for technicians
        const usersResponse = await ipcClient.users.list(1000, 0, user.token);
        const allUsers = usersResponse.data.map((account: BackendUserAccount) => convertTimestamps(account) as UiUserAccount);
        const technicianUsers = allUsers.filter((account: UiUserAccount) => account.role === 'technician');

        setTechnicians(technicianUsers);

        // Calculate stats
        const activeTechnicians = technicianUsers.filter((tech: UiUserAccount) => tech.is_active).length;

        // For now, set basic stats - in a real implementation, you'd fetch these from the backend
        setStats({
          totalTechnicians: technicianUsers.length,
          activeTechnicians,
          tasksCompletedToday: 0, // Would need backend endpoint
          averageTasksPerTechnician: 0, // Would need backend endpoint
        });

      } catch (err) {
        console.error('Failed to fetch technicians:', err);
        setError('Erreur lors du chargement des techniciens');
        toast.error('Erreur lors du chargement des techniciens');
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, [user?.token]);

  if (loading) {
    return (
      <PageShell>
        <LoadingState message="Chargement des techniciens..." />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Gestion des Techniciens"
        subtitle="Gérez votre équipe de techniciens PPF et suivez leurs performances"
        icon={<Users className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
      />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Techniciens
              </CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalTechnicians}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Techniciens Actifs
              </CardTitle>
              <UserCheck className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.activeTechnicians}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tâches Aujourd&apos;hui
              </CardTitle>
              <Clock className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.tasksCompletedToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Moyenne par Technicien
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.averageTasksPerTechnician}</div>
            </CardContent>
          </Card>
        </div>

        {/* Technicians List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Liste des Techniciens</CardTitle>
            <CardDescription className="text-muted-foreground">
              {technicians.length} technicien{technicians.length !== 1 ? 's' : ''} trouvé{technicians.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {technicians.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8 text-muted-foreground" />}
                title="Aucun technicien trouvé"
                description="Les utilisateurs avec le rôle « technicien » apparaîtront ici."
              />
            ) : (
              <div className="space-y-4">
                {technicians.map((technician) => (
                  <div
                    key={technician.id}
                    className="flex items-center justify-between p-4 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-full flex items-center justify-center">
                        <span className="text-[hsl(var(--rpma-teal))] font-medium">
                          {technician.first_name?.[0]}{technician.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-foreground font-medium">
                          {technician.first_name} {technician.last_name}
                        </h3>
                        <p className="text-muted-foreground text-sm">{technician.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={technician.is_active ? "default" : "secondary"}
                        className={technician.is_active
                          ? "bg-[hsl(var(--rpma-teal))] text-white border-transparent"
                          : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {technician.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
  );
}
