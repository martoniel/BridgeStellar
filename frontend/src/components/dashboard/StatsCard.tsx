import { ReactNode } from "react";
import { cn, formatPercentage } from "@/utils/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
}

export default function StatsCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-2.5 bg-primary-50 rounded-lg text-primary-600">
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1.5">
          {trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-success-500" />
          ) : trend < 0 ? (
            <TrendingDown className="h-4 w-4 text-error-500" />
          ) : (
            <Minus className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              trend > 0
                ? "text-success-600"
                : trend < 0
                  ? "text-error-600"
                  : "text-gray-500"
            )}
          >
            {trend > 0 ? "+" : ""}
            {formatPercentage(trend)}
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-500">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
