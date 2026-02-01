'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  value: number | string;
  label: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  size?: 'small' | 'normal';
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  value, 
  label, 
  color, 
  trend = 'neutral', 
  trendValue = '', 
  size = 'normal',
  icon: IconComponent,
  onClick,
  className = ''
}) => {
  const isClickable = !!onClick;
  
  // Calculate trend percentage for better visualization
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <motion.div 
      className={`${color} rounded-lg shadow-sm transition-all duration-200 ${
        isClickable ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
      } ${size === 'small' ? 'p-2' : 'p-3 sm:p-4'} ${className}`}
      onClick={onClick}
      whileHover={{ scale: isClickable ? 1.02 : 1 }}
      whileTap={{ scale: isClickable ? 0.98 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className={`${size === 'small' ? 'text-xs' : 'text-xs sm:text-sm'} font-medium text-muted-foreground mb-1 truncate`}>
            {label}
          </p>
          <p className={`${size === 'small' ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold text-foreground truncate`}>
            {value}
          </p>
        </div>
        {IconComponent && (
          <div className={`${size === 'small' ? 'p-1.5' : 'p-2'} rounded-full bg-background bg-opacity-30 flex-shrink-0 ml-2`}>
            <IconComponent className={`${size === 'small' ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} text-foreground`} />
          </div>
        )}
      </div>
      
      {trend !== 'neutral' && trendValue && (
        <div className="mt-2 sm:mt-3 flex items-center space-x-1">
          <span className={`${getTrendColor()} ${size === 'small' ? 'text-xs' : 'text-xs sm:text-sm'}`}>
            {getTrendIcon()}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up' ? 'bg-green-50 text-green-700' : 
            trend === 'down' ? 'bg-red-50 text-red-700' : 
            'bg-muted text-muted-foreground'
          }`}>
            {trendValue}
          </span>
        </div>
      )}

      {isClickable && (
        <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Cliquez pour voir plus
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
