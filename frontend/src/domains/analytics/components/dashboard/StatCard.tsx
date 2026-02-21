import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  bgColor = "bg-zinc-900",
  borderColor = "border-zinc-800",
  textColor = "text-white"
}: StatCardProps) {
  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-6 transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{title}</p>
          <h3 className={`text-2xl font-bold ${textColor}`}>{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${bgColor} ${textColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
});