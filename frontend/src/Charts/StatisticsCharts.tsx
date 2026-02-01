'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Clock4, TrendingUp, Activity, Users, Target, Award, Download, RefreshCw, Filter, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts';

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageCompletionTime: number;
  efficiencyRate: number;
  productivityTrend: number;
  topTechnician: string;
  completionRate: number;
  avgTasksPerTechnician: number;
  mostActiveZone: string;
  byTechnician: Array<{
    technician: string;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    efficiency: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byPPFZone: Array<{
    zone: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byVehicleModel: Array<{
    model: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  trendData: Array<{
    date: string;
    tasks: number;
    completionRate: number;
    avgTime: number;
  }>;
}

interface StatisticsChartsProps {
  stats: TaskStats;
  timeRange: 'day' | 'week' | 'month' | 'year';
  onTimeRangeChange: (range: 'day' | 'week' | 'month' | 'year') => void;
  onRefresh?: () => void;
  onExport?: (format: 'pdf' | 'csv') => void;
  onFiltersChange?: (filters: {
    technician?: string;
    ppfZone?: string;
    vehicleModel?: string;
  }) => void;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  refreshInterval?: number;
  onRefreshIntervalChange?: (interval: number) => void;
}

// Enhanced color palette
const ENHANCED_COLORS = {
  primary: ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'],
  gradients: {
    success: 'from-green-500 to-emerald-600',
    warning: 'from-yellow-500 to-orange-600',
    info: 'from-blue-500 to-cyan-600',
    danger: 'from-red-500 to-rose-600'
  },
  status: {
    completed: '#10B981',
    inProgress: '#F59E0B',
    pending: '#6B7280'
  }
};

export function StatisticsCharts({
  stats,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExport,
  onFiltersChange,
  autoRefresh = false,
  onAutoRefreshChange,
  refreshInterval = 30000,
  onRefreshIntervalChange
}: StatisticsChartsProps) {
  // Filter state
  const [filters, setFilters] = React.useState({
    technician: 'all_technicians',
    ppfZone: 'all_zones',
    vehicleModel: 'all_models'
  });
  const [showFilters, setShowFilters] = React.useState(false);

  // Filtered data based on current filters
  const filteredStats = React.useMemo(() => {
    // Add null safety checks
    if (!stats) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        averageCompletionTime: 0,
        efficiencyRate: 0,
        productivityTrend: 0,
        topTechnician: 'N/A',
        completionRate: 0,
        avgTasksPerTechnician: 0,
        mostActiveZone: 'N/A',
        byTechnician: [],
        byDate: [],
        byPPFZone: [],
        byVehicleModel: [],
        trendData: []
      };
    }

    let filteredByTechnician = stats.byTechnician || [];
    let filteredByPPFZone = stats.byPPFZone || [];
    let filteredByVehicleModel = stats.byVehicleModel || [];
    const filteredByDate = stats.byDate || [];

    // Apply technician filter
    if (filters.technician && filters.technician !== 'all_technicians') {
      filteredByTechnician = (stats.byTechnician || []).filter(tech =>
        tech.technician.toLowerCase().includes(filters.technician.toLowerCase())
      );
    }

    // Apply PPF zone filter
    if (filters.ppfZone && filters.ppfZone !== 'all_zones') {
      filteredByPPFZone = (stats.byPPFZone || []).filter(zone =>
        zone.zone.toLowerCase().includes(filters.ppfZone.toLowerCase())
      );
    }

    // Apply vehicle model filter
    if (filters.vehicleModel && filters.vehicleModel !== 'all_models') {
      filteredByVehicleModel = (stats.byVehicleModel || []).filter(model =>
        model.model.toLowerCase().includes(filters.vehicleModel.toLowerCase())
      );
    }

    // Recalculate totals based on filters
    const filteredTotal = filteredByTechnician.reduce((sum, tech) => sum + tech.total, 0) ||
                          filteredByPPFZone.reduce((sum, zone) => sum + zone.count, 0) ||
                          filteredByVehicleModel.reduce((sum, model) => sum + model.count, 0) ||
                          stats.total;

    const filteredCompleted = filteredByTechnician.reduce((sum, tech) => sum + tech.completed, 0) ||
                              filteredByPPFZone.reduce((sum, zone) => sum + zone.completed, 0) ||
                              filteredByVehicleModel.reduce((sum, model) => sum + model.completed, 0) ||
                              stats.completed;

    const filteredInProgress = filteredByTechnician.reduce((sum, tech) => sum + tech.inProgress, 0) ||
                               filteredByPPFZone.reduce((sum, zone) => sum + zone.inProgress, 0) ||
                               filteredByVehicleModel.reduce((sum, model) => sum + model.inProgress, 0) ||
                               stats.inProgress;

    return {
      ...stats,
      total: filteredTotal,
      completed: filteredCompleted,
      inProgress: filteredInProgress,
      pending: filteredTotal - filteredCompleted - filteredInProgress,
      byTechnician: filteredByTechnician,
      byPPFZone: filteredByPPFZone,
      byVehicleModel: filteredByVehicleModel,
      byDate: filteredByDate
    };
  }, [stats, filters]);

  // Calculate additional metrics using filtered data
  const completionRate = filteredStats.total > 0 ? (filteredStats.completed / filteredStats.total) * 100 : 0;
  const efficiencyRate = filteredStats.byTechnician.length > 0
    ? filteredStats.byTechnician.reduce((sum, tech) => sum + (tech.efficiency || 0), 0) / filteredStats.byTechnician.length
    : 0;

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const newFilters = { technician: 'all_technicians', ppfZone: 'all_zones', vehicleModel: 'all_models' };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = filters.technician !== 'all_technicians' ||
                          filters.ppfZone !== 'all_zones' ||
                          filters.vehicleModel !== 'all_models';

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Analytics & Insights
          </h2>
          <p className="text-muted-foreground mt-1">
            Performance metrics and productivity analysis for your team
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filter Button */}
          <Popover
            open={showFilters}
            onOpenChange={setShowFilters}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${hasActiveFilters ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtres</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {Object.values(filters).filter(v => v !== '').length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtres de données</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-auto p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Technician Filter */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Technicien</label>
                    <Select value={filters.technician || 'all_technicians'} onValueChange={(value) => handleFilterChange('technician', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_technicians">Tous les techniciens</SelectItem>
                        {(stats?.byTechnician || []).map((tech) => (
                          <SelectItem key={tech.technician} value={tech.technician}>
                            {tech.technician}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* PPF Zone Filter */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Zone PPF</label>
                    <Select value={filters.ppfZone || 'all_zones'} onValueChange={(value) => handleFilterChange('ppfZone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_zones">Toutes les zones</SelectItem>
                        {(stats?.byPPFZone || []).map((zone) => (
                          <SelectItem key={zone.zone} value={zone.zone}>
                            {zone.zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vehicle Model Filter */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Modèle de véhicule</label>
                    <Select value={filters.vehicleModel || 'all_models'} onValueChange={(value) => handleFilterChange('vehicleModel', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_models">Tous les modèles</SelectItem>
                        {(stats?.byVehicleModel || []).map((model) => (
                          <SelectItem key={model.model} value={model.model}>
                            {model.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">
                    Effacer tous les filtres
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Export Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('csv')}
            className="flex items-center gap-1 sm:gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('pdf')}
            className="flex items-center gap-1 sm:gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>

          {/* Auto-refresh Toggle */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Auto-refresh</span>
            <span className="text-xs text-muted-foreground sm:hidden">Auto</span>
            <Switch
              checked={autoRefresh}
              onCheckedChange={onAutoRefreshChange}
            />
          </div>

          {/* Refresh Interval Selector (only shown when auto-refresh is enabled) */}
          {autoRefresh && (
            <Select
              value={refreshInterval.toString()}
              onValueChange={(value) => {
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                  onRefreshIntervalChange?.(numValue);
                }
              }}
            >
              <SelectTrigger className="w-20 sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">10s</SelectItem>
                <SelectItem value="30000">30s</SelectItem>
                <SelectItem value="60000">1m</SelectItem>
                <SelectItem value="300000">5m</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className={`flex items-center gap-1 sm:gap-2 ${autoRefresh ? 'bg-blue-50 border-blue-200' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
            {autoRefresh && (
              <Badge variant="secondary" className="text-xs">
                <span className="hidden sm:inline">Auto</span>
                <span className="sm:hidden">A</span>
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-center lg:justify-start">
        <div className="flex items-center space-x-2 bg-muted/50 p-1 rounded-lg">
          <Button
            variant={timeRange === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTimeRangeChange('day')}
            className="rounded-md"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant={timeRange === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTimeRangeChange('week')}
            className="rounded-md"
          >
            Cette semaine
          </Button>
          <Button
            variant={timeRange === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTimeRangeChange('month')}
            className="rounded-md"
          >
            Ce mois
          </Button>
          <Button
            variant={timeRange === 'year' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTimeRangeChange('year')}
            className="rounded-md"
          >
            Cette année
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Tâches Totales
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">{filteredStats.total}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Taux de Réussite
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
              {completionRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                {filteredStats.completed} sur {filteredStats.total}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Efficacité Équipe
            </CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
              {efficiencyRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                Performance moyenne
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Temps Moyen
            </CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <Clock4 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100">
              {filteredStats.averageCompletionTime.toFixed(1)}h
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                Par tâche terminée
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Top Technicien
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-lg font-semibold text-indigo-900 dark:text-indigo-100">
              {filteredStats.topTechnician || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Technicien le plus performant
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-teal-700 dark:text-teal-300">
              Zone la Plus Active
            </CardTitle>
            <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-lg font-semibold text-teal-900 dark:text-teal-100">
              {filteredStats.mostActiveZone || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Zone PPF la plus demandée
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-300">
              Charge de Travail
            </CardTitle>
            <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-lg font-semibold text-rose-900 dark:text-rose-100">
              {filteredStats.avgTasksPerTechnician?.toFixed(1) || '0'} tâches
            </div>
            <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Moyenne par technicien
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full lg:w-auto grid-cols-2 sm:grid-cols-4 lg:flex">
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Vue d&apos;ensemble</span>
            <span className="xs:hidden">Vue</span>
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Techniciens</span>
            <span className="xs:hidden">Tech</span>
          </TabsTrigger>
          <TabsTrigger value="zones" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Target className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Zones PPF</span>
            <span className="xs:hidden">Zones</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Analytics</span>
            <span className="xs:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Status Distribution - Enhanced Donut Chart */}
            <Card className="xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                  Répartition des Statuts
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Distribution actuelle des tâches</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Terminées', value: stats?.completed || 0, color: ENHANCED_COLORS.status.completed },
                        { name: 'En Cours', value: stats?.inProgress || 0, color: ENHANCED_COLORS.status.inProgress },
                        { name: 'En Attente', value: stats?.pending || 0, color: ENHANCED_COLORS.status.pending },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(((percent as number) || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {[
                        { name: 'Terminées', value: stats?.completed || 0, color: ENHANCED_COLORS.status.completed },
                        { name: 'En Cours', value: stats?.inProgress || 0, color: ENHANCED_COLORS.status.inProgress },
                        { name: 'En Attente', value: stats?.pending || 0, color: ENHANCED_COLORS.status.pending },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} tâches`, '']}
                      labelFormatter={(name) => `${name}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Timeline - Area Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activité Temporelle
                </CardTitle>
                <CardDescription>Évolution des tâches sur la période sélectionnée</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.byDate || []}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ENHANCED_COLORS.status.completed} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={ENHANCED_COLORS.status.completed} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ENHANCED_COLORS.status.inProgress} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={ENHANCED_COLORS.status.inProgress} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: fr })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'PPP', { locale: fr })}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke={ENHANCED_COLORS.status.completed}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                      name="Terminées"
                    />
                    <Area
                      type="monotone"
                      dataKey="inProgress"
                      stackId="1"
                      stroke={ENHANCED_COLORS.status.inProgress}
                      fillOpacity={1}
                      fill="url(#colorInProgress)"
                      name="En Cours"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Productivity Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendances de Productivité
              </CardTitle>
              <CardDescription>Évolution des taux de réussite et temps de réalisation</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.trendData || stats?.byDate || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: fr })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'PPP', { locale: fr })}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="completionRate"
                    stroke={ENHANCED_COLORS.status.completed}
                    strokeWidth={3}
                    dot={{ fill: ENHANCED_COLORS.status.completed }}
                    name="Taux de Réussite (%)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgTime"
                    stroke={ENHANCED_COLORS.status.inProgress}
                    strokeWidth={3}
                    dot={{ fill: ENHANCED_COLORS.status.inProgress }}
                    name="Temps Moyen (h)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicians" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance par Technicien
                </CardTitle>
                <CardDescription>Comparaison des performances individuelles</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                  data={stats?.byTechnician || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                    <YAxis dataKey="technician" type="category" width={120} />
                  <Tooltip />
                  <Legend />
                    <Bar dataKey="completed" name="Terminées" fill={ENHANCED_COLORS.status.completed} />
                    <Bar dataKey="inProgress" name="En Cours" fill={ENHANCED_COLORS.status.inProgress} />
                    <Bar dataKey="pending" name="En Attente" fill={ENHANCED_COLORS.status.pending} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Efficacité par Technicien
                </CardTitle>
                <CardDescription>Ratio de tâches terminées vs total</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.byTechnician || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="%" />
                    <YAxis dataKey="technician" type="category" width={120} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Efficacité']} />
                    <Bar dataKey="efficiency" name="Efficacité" fill={ENHANCED_COLORS.primary[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Répartition par Zone PPF
                </CardTitle>
                <CardDescription>Popularité des zones de protection</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.byPPFZone || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="zone" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                    <Bar dataKey="count" name="Nombre de tâches" fill={ENHANCED_COLORS.primary[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Répartition par Modèle
                </CardTitle>
                <CardDescription>Popularité des modèles de véhicules</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.byVehicleModel || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      label={({ name, percent }) => `${name}: ${(((percent as number) || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(stats?.byVehicleModel || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ENHANCED_COLORS.primary[index % ENHANCED_COLORS.primary.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analyse de Performance
                </CardTitle>
                <CardDescription>Métriques avancées de performance</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats?.byDate || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: fr })}
                    />
                  <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), 'PPP', { locale: fr })}
                    />
                  <Legend />
                    <Bar dataKey="completed" name="Terminées" fill={ENHANCED_COLORS.status.completed} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={ENHANCED_COLORS.primary[0]}
                      strokeWidth={3}
                      name="Total"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Analyse Temporelle
                </CardTitle>
                <CardDescription>Distribution des temps de réalisation</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={stats?.byDate || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" name="Date" />
                    <YAxis dataKey="count" name="Tâches" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="count" fill={ENHANCED_COLORS.primary[2]} />
                  </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
