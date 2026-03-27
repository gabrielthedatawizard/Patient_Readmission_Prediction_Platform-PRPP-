import { useQuery } from "@tanstack/react-query";
import { requestJson } from "../services/apiClient";
import { tripQueryKeys } from "./useTrip";

export function useDashboardData(endpoint, refreshInterval = 300000) {
  const query = useQuery({
    queryKey: tripQueryKeys.dashboardData(endpoint),
    queryFn: () => requestJson(endpoint),
    staleTime: Math.min(refreshInterval || 300000, 300000),
    refetchInterval:
      refreshInterval && refreshInterval > 0 ? refreshInterval : false,
    placeholderData: (previousData) => previousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message || null,
    lastRefresh: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    refresh: query.refetch,
  };
}

export default useDashboardData;
