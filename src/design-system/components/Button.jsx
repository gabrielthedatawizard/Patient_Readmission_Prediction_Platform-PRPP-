import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const buttonVariants = {
  primary:
    "bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-700 hover:to-teal-600",
  secondary:
    "bg-white text-teal-700 border-2 border-teal-600 hover:bg-teal-50 dark:bg-slate-900 dark:border-teal-500/70 dark:text-teal-300 dark:hover:bg-slate-800",
  danger:
    "bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600",
  ghost: "text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-slate-800",
  success:
    "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600",
  warning:
    "bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600",
  outline:
    "border-2 border-teal-600 text-teal-700 bg-white hover:bg-teal-50 dark:bg-slate-900 dark:border-teal-500/70 dark:text-teal-300 dark:hover:bg-slate-800",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
  xl: "px-8 py-4 text-lg",
};

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      icon,
      fullWidth = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const leadingIcon = leftIcon || icon || null;
    const variantClass = buttonVariants[variant] || buttonVariants.primary;
    const sizeClass = sizes[size] || sizes.md;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-lg
          transition-all duration-200 ease-out
          shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950
          ${variantClass}
          ${sizeClass}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          leadingIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
