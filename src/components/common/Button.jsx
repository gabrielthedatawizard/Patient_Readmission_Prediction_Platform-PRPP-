import React from 'react';

/**
 * Button Component
 * Versatile button with multiple variants and sizes
 */

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '', 
  onClick, 
  disabled = false,
  type = 'button',
  fullWidth = false
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl',
    ghost: 'hover:bg-gray-100 text-gray-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl',
    outline: 'border-2 border-teal-600 text-teal-700 hover:bg-teal-50'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} 
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg font-semibold transition-all duration-200
        flex items-center justify-center gap-2 
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
