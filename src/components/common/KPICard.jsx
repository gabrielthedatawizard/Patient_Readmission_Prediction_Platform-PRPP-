import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Card from "./Card";
import AnimatedNumber from "../../design-system/components/AnimatedNumber";
import { Skeleton } from "../../design-system/components/Skeleton";

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
  color = "teal",
  loading = false,
}) => {
  const colorClasses = {
    teal: "from-teal-500 to-teal-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
    purple: "from-sky-500 to-sky-600",
    blue: "from-blue-500 to-blue-600",
    pink: "from-rose-500 to-rose-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  const trendUp = trend === "up";
  const trendColorClass = trendUp ? "text-emerald-600" : "text-red-600";
  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ""));
  const hasNumericValue = Number.isFinite(numericValue);
  const prefixMatch = String(value).match(/^[^0-9-]*/);
  const suffixMatch = String(value).match(/[^0-9]*$/);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  const suffix = suffixMatch ? suffixMatch[0] : "";

  if (loading) {
    return (
      <Card className="p-6" hover={false}>
        <Skeleton variant="text" className="mb-2 w-2/3" />
        <Skeleton variant="title" className="mb-3 w-1/2" />
        <Skeleton variant="text" className="w-1/3" />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2 leading-none">
            {hasNumericValue ? (
              <>
                {prefix}
                <AnimatedNumber value={numericValue} format={(n) => n.toLocaleString()} />
                {suffix}
              </>
            ) : (
              value
            )}
          </p>
          {change && (
            <div className="flex items-center gap-2">
              {trendUp ? (
                <TrendingUp className={`w-4 h-4 ${trendColorClass}`} />
              ) : (
                <TrendingDown className={`w-4 h-4 ${trendColorClass}`} />
              )}
              <span className={`text-sm font-semibold ${trendColorClass}`}>{change}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`
            p-3 rounded-xl bg-gradient-to-br ${colorClasses[color] || colorClasses.teal}
            shadow-md
          `}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default KPICard;
