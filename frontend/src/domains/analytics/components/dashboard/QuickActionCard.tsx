import React from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const QuickActionCard = React.memo(function QuickActionCard({
  title,
  description,
  icon,
  onClick
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 text-left transition-all duration-300 hover:bg-zinc-800/50 hover:border-zinc-700"
    >
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-lg bg-green-900/30 border border-green-800/30 flex items-center justify-center text-green-500 mr-4">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>
    </button>
  );
});