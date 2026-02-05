import React from 'react';

/**
 * Card Component
 * Container with optional glass effect and gradient
 */

const Card = ({ 
  children, 
  className = '', 
  gradient = false, 
  glass = false,
  hover = true,
  padding = 'default'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`
      ${glass ? 'bg-white/80 backdrop-blur-lg border border-white/20' : 'bg-white'}
      ${gradient ? 'bg-gradient-to-br from-white to-gray-50' : ''}
      ${hover ? 'hover:shadow-xl' : ''}
      ${paddingClasses[padding]}
      rounded-xl shadow-lg transition-all duration-300
      ${className}
    `}>
      {children}
    </div>
  );
};

export default Card;
