import React from "react";

const variants = {
  default: "bg-white border border-gray-200 shadow-sm",
  elevated: "bg-white border border-gray-100 shadow-lg",
  outlined: "bg-white border-2 border-teal-500",
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
        ${glass ? "bg-white/80 backdrop-blur-lg border border-white/25" : ""}
        ${gradient ? "bg-gradient-to-br from-white to-gray-50" : ""}
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
