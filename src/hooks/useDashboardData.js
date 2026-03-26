import { useQuery } from "@tanstack/react-query";
import { buildApiUrl } from "../services/runtimeConfig";
import { tripQueryKeys } from "./useTrip";

export function useDashboardData(endpoint, refreshInterval = 300000) {
  const query = useQuery({
    queryKey: tripQueryKeys.dashboardData(endpoint),
    queryFn: async () => {
      const response = await fetch(buildApiUrl(endpoint), {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },
    staleTime: Math.min(refreshInterval || 300000, 300000),
    refetchInterval:
      refreshInterval && refreshInterval > 0 ? refreshInterval : false,
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
