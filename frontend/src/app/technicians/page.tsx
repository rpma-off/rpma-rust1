'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/compatibility';
import { ipcClient } from '@/lib/ipc';
import type { UserAccount as BackendUserAccount } from '@/lib/backend';
import type { UserAccount as UiUserAccount } from '@/lib/types';
import { convertTimestamps } from '@/lib/types';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader, StatCard } from '@/components/ui/page-header';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { EmptyState } from '@/components/layout/EmptyState';
import { SectionCard } from '@/components/layout/SectionCard';
import { useTranslation } from '@/hooks/useTranslation';

interface TechnicianStats {
  totalTechnicians: number;
  activeTechnicians: number;
  tasksCompletedToday: number;
  averageTasksPerTechnician: number;
}

export default function TechniciansPage() {
  const { t } = useTranslation();
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
        setError(t('errors.loadFailed'));
        toast.error(t('errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, [user?.token, t]);

  if (loading) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
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
        title={t('team.technicians')}
        subtitle={t('team.title')}
        icon={<Users className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value={stats.totalTechnicians}
              label={t('team.technicians')}
              icon={Users}
              color="accent"
            />
            <StatCard
              value={stats.activeTechnicians}
              label={t('users.active')}
              icon={UserCheck}
              color="green"
            />
            <StatCard
              value={stats.tasksCompletedToday}
              label={t('tasks.title')}
              icon={Clock}
              color="blue"
            />
            <StatCard
              value={stats.averageTasksPerTechnician}
              label={t('analytics.metrics')}
              icon={TrendingUp}
              color="purple"
            />
          </div>
        }
      />

        {/* Technicians List */}
        <SectionCard
          title={t('team.technicians')}
          description={`${technicians.length} ${t('team.technicians').toLowerCase()}`}
        >
            {technicians.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8 text-muted-foreground" />}
                title={t('users.noUsers')}
                description={t('empty.noData')}
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
                        {technician.is_active ? t('users.active') : t('users.inactive')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </SectionCard>
      </PageShell>
  );
}
