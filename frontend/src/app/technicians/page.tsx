'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/compatibility';
import { ipcClient } from '@/lib/ipc';
import { UserAccount } from '@/types';
import { convertTimestamps } from '@/lib/types';

interface TechnicianStats {
  totalTechnicians: number;
  activeTechnicians: number;
  tasksCompletedToday: number;
  averageTasksPerTechnician: number;
}

export default function TechniciansPage() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<UserAccount[]>([]);
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
        const allUsers = usersResponse.data.map(user => convertTimestamps(user));
        const technicianUsers = allUsers.filter((u) => u.role === 'technician');

        setTechnicians(technicianUsers as unknown as UserAccount[]);

        // Calculate stats
        const activeTechnicians = technicianUsers.filter((t) => t.is_active).length;

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
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-2 border-[hsl(var(--rpma-teal))] border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground text-lg font-medium">Chargement des techniciens...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rpma-shell p-4 md:p-6">
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>
                RÃ©essayer
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="rpma-shell p-4 md:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-full">
                <Users className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                  Gestion des Techniciens
                </h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                  GÃ©rez votre Ã©quipe de techniciens PPF et suivez leurs performances
                </p>
              </div>
            </div>
          </div>
        </div>

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
                TÃ¢ches Aujourd&apos;hui
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
              {technicians.length} technicien{technicians.length !== 1 ? 's' : ''} trouvÃ©{technicians.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {technicians.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Aucun technicien trouvÃ©</h3>
                <p className="text-muted-foreground">
                  Les utilisateurs avec le rÃ´le &ldquo;technicien&rdquo; apparaÃ®tront ici.
                </p>
              </div>
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
      </div>
    </div>
  );
}
