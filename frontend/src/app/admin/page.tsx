'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  User,
  Database,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Server,
  Lock,
  UserCheck,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  Download
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/facade';
import { useAuth } from '@/domains/auth';
import { useRouter } from 'next/navigation';
import { ipcClient, convertTimestamps } from '@/shared/utils';
import type { CreateUserRequest, UserAccount } from '@/shared/types';
import { WorkflowExecutionDashboard } from '@/domains/workflow';
import { QualityAssuranceDashboard } from '@/domains/admin';
import { PhotoDocumentationDashboard } from '@/domains/admin';
import { SecurityDashboard } from '@/domains/admin';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  databaseSize: string;
  uptime: string;
  lastBackup: string;
}

interface RecentActivity {
  id: string;
  type: 'user_login' | 'task_created' | 'task_completed' | 'system_error' | 'backup_completed' | 'intervention_started' | 'client_created';
  description: string;
  timestamp: string;
  user?: string;
  severity?: 'low' | 'medium' | 'high';
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // User management state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Load real system stats from API
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    systemHealth: 'healthy',
    databaseSize: '0 MB',
    uptime: '0h 0m',
    lastBackup: 'Never'
  });

   // Load real recent activities from API
   const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

   // Store dashboard stats for dashboard components
   type DashboardStats = Awaited<ReturnType<typeof ipcClient.dashboard.getStats>>;
   const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.token) return;

      try {
        const dashboardStats = await ipcClient.dashboard.getStats(user.token);

         // Get real system information
          const [healthCheck, dbStats] = await Promise.all([
            ipcClient.admin.healthCheck().catch(() => 'unknown'),
            ipcClient.admin.getDatabaseStats(user.token).catch(() => ({ size_bytes: 0 }))
          ]);

        // Store raw dashboard stats for dashboard components
        setDashboardStats(dashboardStats);

        // Map dashboard stats to SystemStats interface
        setStats({
          totalUsers: dashboardStats.users?.total || 0,
          activeUsers: dashboardStats.users?.active || 0,
          totalTasks: dashboardStats.tasks?.total || 0,
          completedTasks: dashboardStats.tasks?.completed || 0,
          systemHealth: typeof healthCheck === 'string' && healthCheck === 'OK' ? 'healthy' : 'warning',
           databaseSize: typeof dbStats === 'object' && dbStats && 'size_bytes' in dbStats ?
             `${Math.round((dbStats as Record<string, unknown>).size_bytes as number / 1024 / 1024)} MB` : 'Unknown',
          uptime: 'Real-time', // Could be enhanced with actual uptime tracking
          lastBackup: 'Auto-managed' // Could be enhanced with backup status
        });

        // Load recent activities from backend
        try {
          const activitiesData = await ipcClient.notifications.getRecentActivities(user.token);
           const mappedActivities: RecentActivity[] = (activitiesData as Record<string, unknown>[]).map((activity) => ({
            id: activity.id as string,
            type: activity.type as RecentActivity['type'],
            description: activity.description as string,
            timestamp: activity.timestamp as string,
            user: activity.user as string
          }));
          setRecentActivities(mappedActivities);
        } catch (error) {
          console.error('Failed to load recent activities:', error);
          // Fallback to placeholder on error
          const mappedActivities: RecentActivity[] = [
            {
              id: '1',
              type: 'system_error',
              description: 'Erreur de chargement des activités récentes',
              timestamp: new Date().toISOString(),
              user: 'Système'
            }
          ];
          setRecentActivities(mappedActivities);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        // Keep default values on error
      }
    };

    if (user?.token) {
      loadStats();
    }
   }, [user?.token]);

  // Check if user is admin
  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.role !== 'supervisor') {
      router.push('/unauthorized');
    }
   }, [profile, router]);

   // User management functions
   const loadUsers = useCallback(async () => {
     if (!user?.token) return;

     try {
       setIsLoadingUsers(true);
       const result = await ipcClient.users.list(50, 0, user.token);
       if (result && result.data) {
         const normalizedUsers = (result.data || []).map(user => convertTimestamps(user));
         setUsers(normalizedUsers as UserAccount[]);
       }
     } catch (error) {
       console.error('Failed to load users:', error);
     } finally {
       setIsLoadingUsers(false);
     }
   }, [user?.token]);

   const handleAddUser = useCallback(async (userData: CreateUserRequest) => {
     if (!user?.token) return;

     try {
       await ipcClient.users.create(userData, user.token);
      setShowAddUserModal(false);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  }, [user?.token, loadUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (!user?.token) return;

    if (!confirm(t('users.confirmDelete'))) {
      return;
    }

    try {
      await ipcClient.users.delete(userId, user.token);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleUpdateUserStatus = async (userId: string, isActive: boolean) => {
    if (!user?.token) return;

    try {
      if (isActive) {
        await ipcClient.users.unbanUser(userId, user.token);
      } else {
        await ipcClient.users.banUser(userId, user.token);
      }
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  // Load users when users tab is active
  useEffect(() => {
    if (activeTab === 'users' && user?.token) {
      loadUsers();
    }
  }, [activeTab, user?.token, loadUsers]);

  if (!profile || (profile.role !== 'admin' && profile.role !== 'supervisor')) {
    return (
      <PageShell>
        <ErrorState
          title={t('errors.unauthorized')}
          message={t('errors.permissionDenied')}
        />
      </PageShell>
    );
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_login':
        return <UserCheck className="h-4 w-4 text-green-400" />;
      case 'task_created':
        return <Plus className="h-4 w-4 text-blue-400" />;
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'system_error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'backup_completed':
        return <Database className="h-4 w-4 text-purple-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthColor = (health: SystemStats['systemHealth']) => {
    switch (health) {
      case 'healthy':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'critical':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <PageHeader
        title={t('admin.title')}
        subtitle={t('admin.systemSettings')}
        icon={<Shield className="w-6 h-6 text-[hsl(var(--rpma-teal))]" />}
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              value={stats.totalUsers}
              label={t('users.title')}
              icon={Users}
              color="accent"
            />
            <StatCard
              value={stats.activeUsers}
              label={t('users.active')}
              icon={UserCheck}
              color="green"
            />
            <StatCard
              value={stats.totalTasks}
              label={t('tasks.title')}
              icon={BarChart3}
              color="blue"
            />
            <StatCard
              value={stats.systemHealth === 'healthy' ? '✓' : '⚠'}
              label={t('admin.systemHealth')}
              icon={Activity}
              color={stats.systemHealth === 'healthy' ? 'green' : 'yellow'}
            />
          </div>
        }
      />

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList data-variant="underline" className="w-full justify-start bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] px-2">
            <TabsTrigger value="overview" data-variant="underline">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('analytics.overview')}
            </TabsTrigger>
            <TabsTrigger value="users" data-variant="underline">
              <Users className="h-4 w-4 mr-2" />
              {t('users.title')}
            </TabsTrigger>
            <TabsTrigger value="system" data-variant="underline">
              <Server className="h-4 w-4 mr-2" />
              {t('common.system')}
            </TabsTrigger>
            <TabsTrigger value="security" data-variant="underline">
              <Lock className="h-4 w-4 mr-2" />
              {t('settings.security')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Health */}
              <Card className="border-[hsl(var(--rpma-border))] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Activity className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    {t('admin.systemHealth')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('tasks.status')}</span>
                    <Badge className={getHealthColor(stats.systemHealth)}>
                      {stats.systemHealth === 'healthy' ? `✓ ${t('admin.systemHealth')}` :
                       stats.systemHealth === 'warning' ? `⚠ ${t('common.warning')}` : `✗ ${t('common.critical')}`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('common.availability')}</span>
                    <span className="text-foreground font-medium">{stats.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('admin.database')}</span>
                    <span className="text-foreground font-medium">{stats.databaseSize}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-[hsl(var(--rpma-border))] bg-white md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    {t('audit.activity')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                        <div className="flex-shrink-0 mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {activity.user && (
                              <span className="text-xs text-muted-foreground">{activity.user}</span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             </div>

             {/* Dashboard Components */}
             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
               <WorkflowExecutionDashboard taskStats={dashboardStats?.tasks} />
               <QualityAssuranceDashboard
                 clientStats={dashboardStats?.clients}
                 userStats={dashboardStats?.users}
               />
               <PhotoDocumentationDashboard syncStats={dashboardStats?.sync} />
             </div>
           </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-[hsl(var(--rpma-border))] bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">{t('admin.userManagement')}</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('users.createUser')}
                  </Button>
                </div>
                <CardDescription className="text-muted-foreground">
                  {t('users.title')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                     <div className="relative flex-1 max-w-md">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                         placeholder="Rechercher utilisateurs..."
                         value={userSearchQuery}
                         onChange={(e) => setUserSearchQuery(e.target.value)}
                         className="pl-10"
                       />
                     </div>
                     <select
                       value={userRoleFilter}
                       onChange={(e) => setUserRoleFilter(e.target.value)}
                       className="px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground text-sm"
                     >
                       <option value="all">Tous les rôles</option>
                       <option value="admin">Administrateur</option>
                       <option value="supervisor">Superviseur</option>
                       <option value="technician">Technicien</option>
                       <option value="viewer">Observateur</option>
                     </select>
                   </div>
                   <Button
                     onClick={() => setShowAddUserModal(true)}
                     className="font-medium"
                   >
                     <Plus className="h-4 w-4 mr-2" />
                     Ajouter Utilisateur
                   </Button>
                 </div>

                 <div className="space-y-3">
                   {isLoadingUsers ? (
                     <LoadingState message={t('common.loading')} />
                   ) : users.length === 0 ? (
                     <EmptyState
                       icon={<User className="h-8 w-8 text-muted-foreground" />}
                       title={t('users.noUsers')}
                       description={t('empty.noData')}
                     />
                   ) : (
                     <div className="space-y-2">
                       {users
                         .filter(user =>
                           (userRoleFilter === 'all' || user.role === userRoleFilter) &&
                           (userSearchQuery === '' ||
                            `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            user.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
                         )
                         .map((user) => (
                           <div key={user.id} className="flex items-center justify-between p-4 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-[hsl(var(--rpma-surface))] rounded-full flex items-center justify-center">
                                 <User className="h-5 w-5 text-foreground" />
                               </div>
                               <div>
                                 <p className="text-foreground font-medium">{user.first_name} {user.last_name}</p>
                                 <p className="text-muted-foreground text-sm">{user.email}</p>
                               </div>
                             </div>
                             <div className="flex items-center gap-3">
                               <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                 {user.role === 'admin' ? 'Admin' :
                                  user.role === 'supervisor' ? 'Superviseur' :
                                  user.role === 'technician' ? 'Technicien' : 'Observateur'}
                               </Badge>
                               <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-xs">
                                 {user.is_active ? 'Actif' : 'Inactif'}
                               </Badge>
                               <div className="flex gap-2">
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleUpdateUserStatus(user.id, !user.is_active)}
                                   className="border-border/60 text-muted-foreground hover:bg-border/20"
                                 >
                                   {user.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                 </Button>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleDeleteUser(user.id)}
                                   className="border-red-500/60 text-red-400 hover:bg-red-500/20"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </div>
                             </div>
                           </div>
                         ))}
                     </div>
                   )}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[hsl(var(--rpma-border))] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Database className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    {t('admin.database')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('common.size')}</span>
                    <span className="text-foreground font-medium">{stats.databaseSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('admin.backup')}</span>
                    <span className="text-foreground font-medium">{stats.lastBackup}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="border-border/60 text-muted-foreground hover:bg-border/20">
                      <Download className="h-4 w-4 mr-2" />
                      {t('common.export')}
                    </Button>
                    <Button size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('admin.backup')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[hsl(var(--rpma-border))] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Server className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                    {t('analytics.performance')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('common.availability')}</span>
                    <span className="text-foreground font-medium">{stats.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('common.cpuLoad')}</span>
                    <span className="text-green-400 font-medium">23%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('common.memory')}</span>
                    <span className="text-yellow-400 font-medium">67%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityDashboard />
          </TabsContent>
        </Tabs>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('users.createUser')}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const userData: CreateUserRequest = {
                email: String(formData.get('email') || ''),
                first_name: String(formData.get('firstName') || ''),
                last_name: String(formData.get('lastName') || ''),
                role: String(formData.get('role') || ''),
                password: String(formData.get('password') || '')
              };
              handleAddUser(userData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.email')}</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    className=""
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.firstName')}</label>
                    <Input
                      name="firstName"
                      required
                      className=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.lastName')}</label>
                    <Input
                      name="lastName"
                      required
                      className=""
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('users.role')}</label>
                  <select
                    name="role"
                    required
                    className="w-full px-3 py-2 bg-white border border-[hsl(var(--rpma-border))] rounded-[6px] text-foreground"
                  >
                    <option value="viewer">{t('users.roleViewer')}</option>
                    <option value="technician">{t('users.roleTechnician')}</option>
                    <option value="supervisor">{t('users.roleSupervisor')}</option>
                    <option value="admin">{t('users.roleAdmin')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t('auth.password')}</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    className=""
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 border-border/60 text-muted-foreground hover:bg-border/20"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-medium"
                >
                  {t('common.add')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

