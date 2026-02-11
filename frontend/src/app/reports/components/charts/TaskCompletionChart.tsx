'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface TaskCompletionData {
  date: string;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

interface StatusDistributionData {
  status: string;
  count: number;
  percentage: number;
  color: string;
  [key: string]: any; // Add index signature for Recharts compatibility
}

interface TaskCompletionChartProps {
  data: TaskCompletionData[];
  statusDistribution: StatusDistributionData[];
}

const COLORS = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  pending: '#6b7280',
  cancelled: '#ef4444',
  on_hold: '#8b5cf6',
  draft: '#06b6d4'
};

export function TaskCompletionChart({ data, statusDistribution }: TaskCompletionChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-sm text-gray-300">
            {payload[0].value} tâches ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Task Completion Trend */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Tendance de complétion des tâches</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#9ca3af"
              fontSize={12}
            />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#9ca3af' }}
              formatter={(value) => {
                const labels: { [key: string]: string } = {
                  completed: 'Terminées',
                  in_progress: 'En cours',
                  pending: 'En attente',
                  total: 'Total'
                };
                return labels[value] || value;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke={COLORS.completed} 
              strokeWidth={2}
              dot={{ fill: COLORS.completed, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="in_progress" 
              stroke={COLORS.in_progress} 
              strokeWidth={2}
              dot={{ fill: COLORS.in_progress, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              stroke={COLORS.pending} 
              strokeWidth={2}
              dot={{ fill: COLORS.pending, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Distribution par statut</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, payload }) => {
                  const data = payload as StatusDistributionData | undefined;
                  return `${name} ${data?.percentage ?? 0}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Répartition des statuts</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusDistribution} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="status" 
                stroke="#9ca3af" 
                fontSize={12}
                width={80}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
