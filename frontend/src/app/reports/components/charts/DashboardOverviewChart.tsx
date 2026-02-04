'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';

interface DashboardOverviewChartProps {
  data: {
    taskCompletion: any;
    technicianPerformance: any;
    clientAnalytics: any;
    qualityCompliance: any;
  };
}

const COLORS = {
  completed: '#10b981',
  inProgress: '#3b82f6',
  pending: '#6b7280',
  quality: '#8b5cf6',
  satisfaction: '#f59e0b',
  revenue: '#06b6d4',
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#f59e0b'
};

// Animation variants for chart entrance
const chartVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.1,
      duration: 0.4
    }
  })
};

export function DashboardOverviewChart({ data }: DashboardOverviewChartProps) {
  // Prepare data for charts
  const totalTasks = Number(data.taskCompletion.summary.total_tasks);
  const completedTasks = Number(data.taskCompletion.summary.completed_tasks);

  const taskStatusData = [
    {
      name: 'Terminées',
      value: completedTasks,
      color: COLORS.completed
    },
    {
      name: 'En cours',
      value: totalTasks - completedTasks,
      color: COLORS.inProgress
    },
    {
      name: 'En attente',
      value: Math.max(0, totalTasks - completedTasks - 5), // Estimate pending tasks
      color: COLORS.pending
    }
  ];

  const technicianData = data.technicianPerformance.technicians.slice(0, 5).map((tech: any) => ({
    name: tech.name.split(' ')[0], // First name only
    tasks: Number(tech.metrics.tasks_completed),
    quality: Math.round(tech.metrics.quality_score),
    satisfaction: Math.round(tech.metrics.customer_satisfaction * 20) // Scale to 0-100
  }));

  const qualityData = [
    {
      name: 'Score Qualité',
      value: Math.round(data.qualityCompliance.compliance_rate || 0),
      color: COLORS.quality
    },
    {
      name: 'Satisfaction Client',
      value: Math.round(data.technicianPerformance.technicians.reduce((sum: number, tech: any) =>
        sum + (tech.metrics?.customer_satisfaction || 0), 0) / Math.max(data.technicianPerformance.technicians.length, 1) * 100),
      color: COLORS.satisfaction
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="rpma-shell p-4"
        >
          <p className="text-foreground font-semibold mb-3 text-sm">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 text-sm"
              >
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-border-light">
                  {entry.name}: <span className="text-foreground font-medium">
                    {entry.value}{entry.name.includes('Score') || entry.name.includes('Satisfaction') ? '%' : ''}
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="space-y-6"
      variants={chartVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Task Status Distribution */}
      <motion.div
        className="rpma-shell p-6 md:p-8"
        variants={itemVariants}
        custom={0}
      >
        <div className="mb-6 md:mb-8">
          <motion.h3
            className="text-xl md:text-2xl font-bold text-foreground mb-2 text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Répartition des tâches
          </motion.h3>
          <motion.p
            className="text-border-light text-sm md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            État actuel des interventions
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                stroke="none"
                animationBegin={400}
                animationDuration={800}
              >
                {taskStatusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

      {/* Technician Performance & Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Performance */}
        <motion.div
          className="rpma-shell p-6 md:p-8"
          variants={itemVariants}
          custom={1}
        >
          <div className="mb-6 md:mb-8">
            <motion.h3
              className="text-xl md:text-2xl font-bold text-foreground mb-2 text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Performance des techniciens
            </motion.h3>
            <motion.p
              className="text-border-light text-sm md:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Tâches complétées par technicien
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={technicianData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.3)" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="tasks"
                  fill={COLORS.primary}
                  radius={[4, 4, 0, 0]}
                  name="Tâches complétées"
                  animationBegin={600}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Quality Metrics */}
        <motion.div
          className="rpma-shell p-6 md:p-8"
          variants={itemVariants}
          custom={2}
        >
          <div className="mb-6 md:mb-8">
            <motion.h3
              className="text-xl md:text-2xl font-bold text-foreground mb-2 text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Métriques de qualité
            </motion.h3>
            <motion.p
              className="text-border-light text-sm md:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Score qualité et satisfaction client
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={qualityData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.3)" />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} animationBegin={600} animationDuration={1000}>
                  {qualityData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
