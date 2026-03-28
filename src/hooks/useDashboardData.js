import { useQuery } from "@tanstack/react-query";
import { requestJson } from "../services/apiClient";
import { useWorkspace } from "../context/WorkspaceProvider";
import { appendScopeToPath } from "../services/workspaceScope";
import { tripQueryKeys } from "./useTrip";

export function useDashboardData(endpoint, refreshInterval = 300000) {
  const { scopeQuery } = useWorkspace();
  const scopedEndpoint = endpoint.startsWith("/analytics/")
    ? appendScopeToPath(endpoint, scopeQuery)
    : endpoint;
  const query = useQuery({
    queryKey: tripQueryKeys.dashboardData(scopedEndpoint),
    queryFn: () => requestJson(scopedEndpoint),
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
