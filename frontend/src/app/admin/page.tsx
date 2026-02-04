'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/compatibility';
import { useRouter } from 'next/navigation';
import { ipcClient } from '@/lib/ipc';
import { WorkflowExecutionDashboard } from '@/components/dashboard/WorkflowExecutionDashboard';
import { QualityAssuranceDashboard } from '@/components/dashboard/QualityAssuranceDashboard';
import { PhotoDocumentationDashboard } from '@/components/dashboard/PhotoDocumentationDashboard';
import { SecurityDashboard } from '@/components/dashboard/SecurityDashboard';

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
  const { user, profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  // User management state
  const [users, setUsers] = useState<any[]>([]);
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
   const [dashboardStats, setDashboardStats] = useState<Record<string, any> | null>(null);

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.token) return;

      try {
        setIsLoading(true);
        const dashboardStats = await ipcClient.dashboard.getStats();

         // Get real system information
         const [healthCheck, dbStats] = await Promise.all([
           ipcClient.system.healthCheck().catch(() => 'unknown'),
           ipcClient.system.getDatabaseStats().catch(() => ({ size_bytes: 0 }))
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
      } finally {
        setIsLoading(false);
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
   const loadUsers = async () => {
     if (!user?.token) return;

     try {
       setIsLoadingUsers(true);
       const result = await ipcClient.users.list(50, 0, user.token);
       if (result && result.data) {
         setUsers(result.data || []);
       }
     } catch (error) {
       console.error('Failed to load users:', error);
     } finally {
       setIsLoadingUsers(false);
     }
   };

   const handleAddUser = async (userData: Record<string, unknown>) => {
     if (!user?.token) return;

     try {
       await ipcClient.users.create(userData as any, user.token);
      setShowAddUserModal(false);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user?.token) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
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
  }, [activeTab, user?.token]);

  if (!profile || (profile.role !== 'admin' && profile.role !== 'supervisor')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-border mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Accès Restreint</h2>
          <p className="text-border-light">Vous n&apos;avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
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
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="rpma-shell p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Shield className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Administration Système
                </h1>
                <p className="text-border-light text-sm md:text-base">
                  Gestion et surveillance du système RPMA V2
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border/30">
                <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
                <div className="text-xs text-border-light">Utilisateurs</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border/30">
                <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
                <div className="text-xs text-border-light">Actifs</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border/30">
                <div className="text-2xl font-bold text-blue-400">{stats.totalTasks}</div>
                <div className="text-xs text-border-light">Tâches</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border/30">
                <Badge className={`px-3 py-1 ${getHealthColor(stats.systemHealth)}`}>
                  {stats.systemHealth === 'healthy' ? '✓ Sain' :
                   stats.systemHealth === 'warning' ? '⚠ Attention' : '✗ Critique'}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-border/20 border-border/30">
            <TabsTrigger value="overview" className="data-[state=active]:bg-accent data-[state=active]:text-black">
              <BarChart3 className="h-4 w-4 mr-2" />
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-accent data-[state=active]:text-black">
              <Users className="h-4 w-4 mr-2" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-accent data-[state=active]:text-black">
              <Server className="h-4 w-4 mr-2" />
              Système
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-accent data-[state=active]:text-black">
              <Lock className="h-4 w-4 mr-2" />
              Sécurité
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Health */}
              <Card className="border-[hsl(var(--rpma-border))] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Activity className="h-5 w-5 text-accent" />
                    Santé Système
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Statut</span>
                    <Badge className={getHealthColor(stats.systemHealth)}>
                      {stats.systemHealth === 'healthy' ? '✓ Sain' :
                       stats.systemHealth === 'warning' ? '⚠ Attention' : '✗ Critique'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Disponibilité</span>
                    <span className="text-foreground font-medium">{stats.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Base de données</span>
                    <span className="text-foreground font-medium">{stats.databaseSize}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-[hsl(var(--rpma-border))] bg-white md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-accent" />
                    Activité Récente
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
                              <span className="text-xs text-border-light">{activity.user}</span>
                            )}
                            <span className="text-xs text-border-light">
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
                  <CardTitle className="text-foreground">Gestion des Utilisateurs</CardTitle>
                  <Button className="bg-accent hover:bg-accent/90 text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter Utilisateur
                  </Button>
                </div>
                <CardDescription className="text-border-light">
                  Gérez les comptes utilisateurs et leurs permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                     <div className="relative flex-1 max-w-md">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-border" />
                       <Input
                         placeholder="Rechercher utilisateurs..."
                         value={userSearchQuery}
                         onChange={(e) => setUserSearchQuery(e.target.value)}
                         className="pl-10 bg-background/50 border-border/30 text-foreground"
                       />
                     </div>
                     <select
                       value={userRoleFilter}
                       onChange={(e) => setUserRoleFilter(e.target.value)}
                       className="px-3 py-2 bg-background/50 border border-border/30 rounded-md text-foreground text-sm"
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
                     className="bg-accent hover:bg-accent/80 text-foreground font-medium"
                   >
                     <Plus className="h-4 w-4 mr-2" />
                     Ajouter Utilisateur
                   </Button>
                 </div>

                 <div className="space-y-3">
                   {isLoadingUsers ? (
                     <div className="text-center py-8">
                       <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
                       <p className="text-border-light">Chargement des utilisateurs...</p>
                     </div>
                   ) : users.length === 0 ? (
                     <div className="text-center py-8 text-border-light">
                       <User className="h-12 w-12 mx-auto mb-4 text-border" />
                       <p className="text-sm">Aucun utilisateur trouvé</p>
                     </div>
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
                               <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                                 <User className="h-5 w-5 text-accent" />
                               </div>
                               <div>
                                 <p className="text-foreground font-medium">{user.first_name} {user.last_name}</p>
                                 <p className="text-border-light text-sm">{user.email}</p>
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
                                   className="border-border/60 text-border-light hover:bg-border/20"
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
                    <Database className="h-5 w-5 text-accent" />
                    Base de Données
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Taille</span>
                    <span className="text-foreground font-medium">{stats.databaseSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Dernière sauvegarde</span>
                    <span className="text-foreground font-medium">{stats.lastBackup}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="border-border/60 text-border-light hover:bg-border/20">
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                    <Button size="sm" className="bg-accent hover:bg-accent/90 text-black">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[hsl(var(--rpma-border))] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Server className="h-5 w-5 text-accent" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Disponibilité</span>
                    <span className="text-foreground font-medium">{stats.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Charge CPU</span>
                    <span className="text-green-400 font-medium">23%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-border-light">Mémoire</span>
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
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Ajouter un Utilisateur</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const userData = {
                email: formData.get('email'),
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
                role: formData.get('role'),
                password: formData.get('password')
              };
              handleAddUser(userData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-border-light mb-1">Email</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    className="bg-background/50 border-border/30 text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-border-light mb-1">Prénom</label>
                    <Input
                      name="firstName"
                      required
                      className="bg-background/50 border-border/30 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-border-light mb-1">Nom</label>
                    <Input
                      name="lastName"
                      required
                      className="bg-background/50 border-border/30 text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-border-light mb-1">Rôle</label>
                  <select
                    name="role"
                    required
                    className="w-full px-3 py-2 bg-background/50 border border-border/30 rounded-md text-foreground"
                  >
                    <option value="viewer">Observateur</option>
                    <option value="technician">Technicien</option>
                    <option value="supervisor">Superviseur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-border-light mb-1">Mot de passe</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    className="bg-background/50 border-border/30 text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 border-border/60 text-border-light hover:bg-border/20"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-accent hover:bg-accent/80 text-foreground font-medium"
                >
                  Ajouter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
