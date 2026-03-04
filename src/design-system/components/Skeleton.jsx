import React from "react";

const variants = {
  text: "h-4 w-full rounded",
  title: "h-6 w-3/4 rounded",
  avatar: "h-12 w-12 rounded-full",
  card: "h-32 w-full rounded-lg",
};

export const Skeleton = ({ className = "", variant = "text" }) => {
  const variantClass = variants[variant] || variants.text;

  return (
    <div
      className={`trip-skeleton ${variantClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    />
  );
};

export const PatientCardSkeleton = () => (
  <div className="bg-white p-6 rounded-xl border border-gray-200">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="avatar" />
      <div className="flex-1">
        <Skeleton variant="title" className="mb-2" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" />
      <Skeleton variant="text" className="w-5/6" />
      <Skeleton variant="text" className="w-4/6" />
    </div>
  </div>
);
