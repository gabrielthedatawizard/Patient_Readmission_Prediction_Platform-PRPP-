import React from 'react';

/**
 * Badge Component
 * Small status indicator or label
 */

const Badge = ({ 
  children, 
  variant = 'default', 
  className = '',
  size = 'default',
  dot = false
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-teal-100 text-teal-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-teal-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500'
  };
  
  return (
    <span className={`
      ${variants[variant]} 
      ${sizes[size]}
      rounded-full font-semibold inline-flex items-center gap-1.5
      ${className}
    `}>
      {dot && (
        <span className={`w-2 h-2 rounded-full ${dotColors[variant]}`}></span>
      )}
      {children}
    </span>
  );
};

export default Badge;
