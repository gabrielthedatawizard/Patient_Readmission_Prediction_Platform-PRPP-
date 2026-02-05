import React from 'react';
import Card from './Card';
import { TrendingUp } from 'lucide-react';

/**
 * KPICard Component
 * Display key performance indicators with trends
 */

const KPICard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color = 'teal',
  loading = false
}) => {
  const colorClasses = {
    teal: 'from-teal-500 to-teal-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600'
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6 hover:scale-105 transition-transform duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
              )}
              <span className={`text-sm font-semibold ${
                trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {change}
              </span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`
            p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} 
            shadow-lg
          `}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default KPICard;
