import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "../services/apiClient";
import {
  exportTrainingDataset,
  fetchAnomalies,
  fetchAutomationSummary,
  fetchBedForecast,
  fetchDashboardKPIs,
  fetchFacilityComparison,
  fetchFairnessSnapshot,
  fetchMlMonitoring,
  fetchQualitySnapshot,
} from "../services/analyticsDataService";

const FIVE_MINUTES = 5 * 60 * 1000;
const TWO_MINUTES = 2 * 60 * 1000;

export const analyticsQueryKeys = {
  all: ["trip", "analytics"],
  overview: (params = {}) => ["trip", "analytics", "overview", params],
  qualityFairness: (params = {}) => [
    "trip",
    "analytics",
    "quality-fairness",
    params,
  ],
  monitoringBundle: () => ["trip", "analytics", "ml-monitoring"],
  auditLogs: (params = {}) => ["trip", "analytics", "audit", params],
};

export function useAnalyticsOverviewQuery(
  { days = 30, facilityId } = {},
  options = {},
) {
  return useQuery({
    queryKey: analyticsQueryKeys.overview({ days, facilityId }),
    queryFn: async () => {
      const [kpis, facilities, anomalies, forecast, automation, quality, fairness] =
        await Promise.all([
          fetchDashboardKPIs({ days, facilityId }),
          fetchFacilityComparison({ days }),
          fetchAnomalies({ facilityId }),
          fetchBedForecast({ facilityId, days: 7 }),
          fetchAutomationSummary({ days, facilityId }),
          fetchQualitySnapshot({ facilityId }),
          fetchFairnessSnapshot({ facilityId }),
        ]);

      return {
        kpis,
        facilities,
        anomalies,
        forecast,
        automation,
        quality,
        fairness,
      };
    },
    staleTime: options.staleTime ?? TWO_MINUTES,
    refetchInterval:
      options.refetchInterval === undefined
        ? FIVE_MINUTES
        : options.refetchInterval,
    placeholderData: (previousData) => previousData,
    enabled: options.enabled ?? true,
  });
}

export function useQualityFairnessQuery(
  { facilityId } = {},
  options = {},
) {
  return useQuery({
    queryKey: analyticsQueryKeys.qualityFairness({ facilityId }),
    queryFn: async () => {
      const [quality, fairness] = await Promise.all([
        fetchQualitySnapshot({ facilityId }),
        fetchFairnessSnapshot({ facilityId }),
      ]);

      return {
        quality,
        fairness,
      };
    },
    staleTime: options.staleTime ?? TWO_MINUTES,
    refetchInterval:
      options.refetchInterval === undefined
        ? false
        : options.refetchInterval,
    placeholderData: (previousData) => previousData,
    enabled: options.enabled ?? true,
  });
}

export function useMlMonitoringBundleQuery(options = {}) {
  return useQuery({
    queryKey: analyticsQueryKeys.monitoringBundle(),
    queryFn: async () => {
      const labels = [
        "ML monitoring",
        "Data quality snapshot",
        "Fairness snapshot",
        "Operational anomalies",
      ];
      const [monitoringResult, qualityResult, fairnessResult, anomaliesResult] =
        await Promise.allSettled([
          fetchMlMonitoring(),
          fetchQualitySnapshot({}),
          fetchFairnessSnapshot({}),
          fetchAnomalies({}),
        ]);

      const results = [monitoringResult, qualityResult, fairnessResult, anomaliesResult];
      const issues = results
        .map((result, index) =>
          result.status === "fulfilled"
            ? null
            : {
                source: labels[index],
                message: result.reason?.message || `${labels[index]} is currently unavailable.`,
              },
        )
        .filter(Boolean);

      const monitoring =
        monitoringResult.status === "fulfilled" ? monitoringResult.value : null;
      const quality = qualityResult.status === "fulfilled" ? qualityResult.value : null;
      const fairness =
        fairnessResult.status === "fulfilled" ? fairnessResult.value : null;
      const anomalies =
        anomaliesResult.status === "fulfilled" ? anomaliesResult.value : [];

      if (!monitoring && !quality && !fairness && !anomalies.length) {
        const error = new Error(
          issues[0]?.message || "Unable to load monitoring surfaces.",
        );
        error.issues = issues;
        throw error;
      }

      return {
        monitoring,
        quality,
        fairness,
        anomalies,
        issues,
      };
    },
    staleTime: options.staleTime ?? TWO_MINUTES,
    refetchInterval:
      options.refetchInterval === undefined
        ? TWO_MINUTES
        : options.refetchInterval,
    placeholderData: (previousData) => previousData,
    enabled: options.enabled ?? true,
  });
}

export function useAuditLogsQuery(
  { limit = 50, offset = 0 } = {},
  options = {},
) {
  return useQuery({
    queryKey: analyticsQueryKeys.auditLogs({ limit, offset }),
    queryFn: () => fetchAuditLogs({ limit, offset }),
    staleTime: options.staleTime ?? 60 * 1000,
    refetchInterval:
      options.refetchInterval === undefined
        ? false
        : options.refetchInterval,
    placeholderData: (previousData) => previousData,
    enabled: options.enabled ?? true,
  });
}

export function useTrainingDatasetExportMutation(options = {}) {
  return useMutation({
    mutationFn: (variables) => exportTrainingDataset(variables),
    onSuccess: (result, variables) => {
      if (typeof options.onSuccess === "function") {
        options.onSuccess(result, variables);
      }
    },
    onError: (error, variables) => {
      if (typeof options.onError === "function") {
        options.onError(error, variables);
      }
    },
  });
}
