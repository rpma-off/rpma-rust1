import { TaskStatus } from '@/shared/types';

export interface TaskCompletionData {
  date: string;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export interface StatusDistributionData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TechnicianPerformanceData {
  id: string;
  name: string;
  tasksCompleted: number;
  averageTimePerTask: number;
  qualityScore: number;
  customerSatisfaction: number;
  utilizationRate: number;
}

const COLORS = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  pending: '#6b7280',
  cancelled: '#ef4444',
  on_hold: '#8b5cf6',
  draft: '#06b6d4',
  scheduled: '#3b82f6',
  failed: '#dc2626',
  overdue: '#f97316'
};

const STATUS_LABELS: { [key in TaskStatus]: string } = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  on_hold: 'En pause',
  pending: 'En attente',
  invalid: 'Invalide',
  archived: 'Archivé',
  failed: 'Échoué',
  overdue: 'En retard',
  assigned: 'Assigné',
  paused: 'Pause'
};

export function generateTaskCompletionData(days: number = 30): TaskCompletionData[] {
  const data: TaskCompletionData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const total = Math.floor(Math.random() * 20) + 10;
    const completed = Math.floor(Math.random() * (total * 0.8)) + Math.floor(total * 0.1);
    const inProgress = Math.floor(Math.random() * (total - completed));
    const pending = total - completed - inProgress;
    
    data.push({
      date: date.toISOString().split('T')[0],
      completed,
      inProgress,
      pending,
      total
    });
  }
  
  return data;
}

export function generateStatusDistributionData(): StatusDistributionData[] {
  const statuses: TaskStatus[] = ['completed', 'in_progress', 'pending', 'scheduled', 'on_hold', 'cancelled'];
  const data = statuses.map(status => {
    const count = Math.floor(Math.random() * 50) + 5;
    return {
      status: STATUS_LABELS[status],
      count,
      percentage: 0, // Will be calculated
      color: COLORS[status as keyof typeof COLORS] || '#6b7280'
    };
  });
  
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return data.map(item => ({
    ...item,
    percentage: Math.round((item.count / total) * 100)
  }));
}

export function generateTechnicianPerformanceData(): TechnicianPerformanceData[] {
  const technicians = [
    'Jean Dupont',
    'Marie Martin',
    'Pierre Bernard',
    'Sophie Laurent',
    'Thomas Petit'
  ];
  
  return technicians.map((name, index) => ({
    id: `tech_${index + 1}`,
    name,
    tasksCompleted: Math.floor(Math.random() * 30) + 15,
    averageTimePerTask: Math.floor(Math.random() * 120) + 60, // minutes
    qualityScore: Math.floor(Math.random() * 20) + 80, // 80-100
    customerSatisfaction: Math.random() * 1.5 + 3.5, // 3.5-5.0
    utilizationRate: Math.random() * 0.4 + 0.6 // 60-100%
  }));
}

export function generateClientAnalyticsData() {
  return {
    totalClients: 150,
    newClientsThisMonth: 12,
    returningClients: 89,
    clientRetentionRate: 85,
    averageRevenuePerClient: 1250,
    topClients: [
      { name: 'Auto Luxury Garage', revenue: 15000, tasks: 12 },
      { name: 'Premium Cars', revenue: 12000, tasks: 8 },
      { name: 'Sport Auto', revenue: 8500, tasks: 6 }
    ]
  };
}

export function generateQualityMetricsData() {
  return {
    overallQualityScore: 92,
    photoComplianceRate: 88,
    stepCompletionAccuracy: 95,
    commonIssues: [
      { issue: 'Photos manquantes', count: 15, percentage: 25 },
      { issue: 'Qualité photo faible', count: 12, percentage: 20 },
      { issue: 'Étapes sautées', count: 8, percentage: 13 },
      { issue: 'Documentation incomplète', count: 6, percentage: 10 }
    ],
    qualityTrend: generateTaskCompletionData(30).map(item => ({
      ...item,
      qualityScore: Math.floor(Math.random() * 15) + 85 // 85-100
    }))
  };
}

export function generateMaterialUsageData() {
  return {
    totalMaterialCost: 45000,
    costPerTask: 375,
    wastePercentage: 12,
    topMaterials: [
      { name: 'Film PPF Premium', usage: 85, cost: 25000 },
      { name: 'Film PPF Standard', usage: 62, cost: 15000 },
      { name: 'Film PPF Sport', usage: 28, cost: 5000 }
    ],
    monthlyUsage: generateTaskCompletionData(12).map((item, index) => ({
      month: new Date(2024, index, 1).toLocaleDateString('fr-FR', { month: 'short' }),
      usage: Math.floor(Math.random() * 100) + 50,
      cost: Math.floor(Math.random() * 5000) + 2000
    }))
  };
}
