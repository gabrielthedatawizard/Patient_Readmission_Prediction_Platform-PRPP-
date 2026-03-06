import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";

export const KPICard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  footer,
  comparison,
  onClick,
  className = "",
}) => {
  const isTrendUp = trend?.direction === "up";
  const trendIcon = isTrendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  const trendColor = trend?.isGood ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { y: -3 } : {}}
      onClick={onClick}
      className={`bg-white rounded-xl p-6 border border-neutral-200 transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-teal-300 hover:shadow-lg" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <div className="p-3 bg-teal-50 rounded-lg">
            <Icon className="w-6 h-6 text-teal-600" />
          </div>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-neutral-900">{value}</span>
        {trend ? (
          <span className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${trendColor}`}>
            {trendIcon}
            {Math.abs(Number(trend.value || 0))}%
          </span>
        ) : null}
      </div>

      {comparison ? (
        <div className="mb-3 space-y-1">
          {comparison.national !== undefined ? (
            <p className="text-xs text-neutral-600">
              National: <span className="font-semibold">{comparison.national}%</span>
            </p>
          ) : null}
          {comparison.target !== undefined ? (
            <p className="text-xs text-neutral-600">
              Target: <span className="font-semibold">{comparison.target}%</span>
            </p>
          ) : null}
          {comparison.percentile !== undefined ? (
            <p className="text-xs text-neutral-600">
              Rank: <span className="font-semibold">{comparison.percentile}th percentile</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {footer ? (
        <p className="text-xs text-neutral-500 flex items-center gap-1">
          {footer}
          {onClick ? <ArrowRight className="w-3 h-3" /> : null}
        </p>
      ) : null}
    </motion.div>
  );
};

export default KPICard;
