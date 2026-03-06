import React from "react";

const variants = {
  default: "bg-white border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800",
  elevated: "bg-white border border-gray-100 shadow-lg dark:bg-slate-900 dark:border-slate-800",
  outlined: "bg-white border-2 border-teal-500 dark:bg-slate-900 dark:border-teal-500/70",
};

const paddingClasses = {
  none: "",
  sm: "p-4",
  default: "p-6",
  lg: "p-8",
};

const Card = ({
  children,
  variant = "default",
  gradient = false,
  glass = false,
  hover = true,
  hoverable,
  padding = "default",
  className = "",
  ...props
}) => {
  const activeHover = typeof hoverable === "boolean" ? hoverable : hover;
  const variantClass = variants[variant] || variants.default;
  const padClass = paddingClasses[padding] || paddingClasses.default;

  return (
    <div
      className={`
        rounded-xl
        transition-all duration-200 ease-out
        ${variantClass}
        ${glass ? "bg-white/80 backdrop-blur-lg border border-white/25 dark:bg-slate-950/75 dark:border-slate-800" : ""}
        ${gradient ? "bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-950" : ""}
        ${activeHover ? "hover:shadow-xl hover:-translate-y-1" : ""}
        ${padClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
