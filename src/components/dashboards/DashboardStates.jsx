import Button from "../common/Button";
import { AlertCircle, RefreshCw } from "lucide-react";

export const DashboardSkeleton = ({ cards = 4 }) => {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-72 bg-neutral-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="h-36 bg-neutral-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-neutral-200 rounded-xl animate-pulse" />
    </div>
  );
};

export const ErrorState = ({ error, onRetry }) => {
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-700 mx-auto mb-2" />
        <h2 className="font-semibold text-red-900 mb-1">Unable to load dashboard</h2>
        <p className="text-sm text-red-700 mb-4">{error || "Unknown error"}</p>
        <Button variant="danger" onClick={onRetry} icon={<RefreshCw className="w-4 h-4" />}>
          Retry
        </Button>
      </div>
    </div>
  );
};

export const EmptyState = ({ message = "No data available." }) => {
  return (
    <div className="p-8 rounded-xl border border-dashed border-neutral-300 text-center text-neutral-600">{message}</div>
  );
};

export default DashboardSkeleton;
