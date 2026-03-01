import React from 'react';
import Badge from './Badge';

/**
 * RiskScoreDisplay Component
 * Visual representation of patient readmission risk score
 */

const RiskScoreDisplay = ({ 
  score, 
  tier, 
  size = 'md',
  showLabel = true,
  showBadge = true
}) => {
  const sizes = {
    sm: { container: 'w-12 h-12', text: 'text-base' },
    md: { container: 'w-20 h-20', text: 'text-xl' },
    lg: { container: 'w-24 h-24', text: 'text-2xl' },
    xl: { container: 'w-32 h-32', text: 'text-3xl' }
  };
  
  const tierColors = {
    Low: { 
      bg: 'from-emerald-400 to-emerald-600', 
      text: 'text-emerald-700',
      ring: 'ring-emerald-200'
    },
    Medium: { 
      bg: 'from-amber-400 to-amber-600', 
      text: 'text-amber-700',
      ring: 'ring-amber-200'
    },
    High: { 
      bg: 'from-red-400 to-red-600', 
      text: 'text-red-700',
      ring: 'ring-red-200'
    }
  };
  
  const colors = tierColors[tier] || tierColors.Low;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`
        ${sizes[size].container}
        rounded-full bg-gradient-to-br ${colors.bg}
        flex items-center justify-center shadow-xl
        relative overflow-hidden
        ring-4 ${colors.ring}
      `}>
        {/* Animated pulse effect */}
        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        
        {/* Score */}
        <span className={`${sizes[size].text} font-bold text-white relative z-10`}>
          {score}
        </span>
      </div>
      
      {/* Risk tier badge */}
      {showBadge && (
        <Badge variant={tier.toLowerCase()} size={size === 'sm' ? 'sm' : 'default'}>
          {showLabel ? `${tier} Risk` : tier}
        </Badge>
      )}
    </div>
  );
};

export default RiskScoreDisplay;
