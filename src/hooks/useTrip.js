import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert,
  fetchAlerts,
  fetchBatchPredictions,
  fetchPatients,
  fetchPredictionHistory,
  fetchPredictionWorkflow,
  fetchRecentPredictions,
  fetchTasks,
  overridePrediction,
  resolveAlert,
  updateTask,
} from "../services/apiClient";

const FIVE_MINUTES = 5 * 60 * 1000;

export const tripQueryKeys = {
  all: ["trip"],
  patients: (filters = {}) => ["trip", "patients", filters],
  tasks: (filters = {}) => ["trip", "tasks", filters],
  alerts: (filters = {}) => ["trip", "alerts", filters],
  batchPredictions: (patientIds = []) => [
    "trip",
    "predictions",
    "batch",
    patientIds,
  ],
  predictionHistory: (patientId) => [
    "trip",
    "predictions",
    "history",
    patientId,
  ],
  recentPredictions: (filters = {}) => ["trip", "predictions", "recent", filters],
  predictionWorkflow: (predictionId) => [
    "trip",
    "predictions",
    "workflow",
    predictionId,
  ],
  dashboardData: (endpoint) => ["trip", "dashboard", endpoint],
};

export function usePatientsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.patients(filters),
    queryFn: () => fetchPatients(filters),
    staleTime: options.staleTime ?? FIVE_MINUTES,
    enabled: options.enabled ?? true,
  });
}

export function useTasksQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.tasks(filters),
    queryFn: () => fetchTasks(filters),
    staleTime: options.staleTime ?? FIVE_MINUTES,
    enabled: options.enabled ?? true,
  });
}

export function useAlertsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.alerts(filters),
    queryFn: () => fetchAlerts(filters),
    staleTime: options.staleTime ?? 60 * 1000,
    refetchInterval:
      options.refetchInterval === undefined
        ? false
        : options.refetchInterval,
    enabled: options.enabled ?? true,
  });
}

export function useBatchPredictionsQuery(patientIds = [], options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.batchPredictions(patientIds),
    queryFn: () => fetchBatchPredictions(patientIds),
    staleTime: options.staleTime ?? FIVE_MINUTES,
    enabled:
      (options.enabled ?? true) &&
      Array.isArray(patientIds) &&
      patientIds.length > 0,
  });
}

export function usePredictionHistoryQuery(patientId, options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.predictionHistory(patientId),
    queryFn: () => fetchPredictionHistory(patientId),
    staleTime: options.staleTime ?? 60 * 1000,
    enabled: (options.enabled ?? true) && Boolean(patientId),
  });
}

export function useRecentPredictionsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.recentPredictions(filters),
    queryFn: () => fetchRecentPredictions(filters),
    staleTime: options.staleTime ?? 60 * 1000,
    refetchInterval:
      options.refetchInterval === undefined
        ? false
        : options.refetchInterval,
    enabled: options.enabled ?? true,
  });
}

export function usePredictionWorkflowQuery(predictionId, options = {}) {
  return useQuery({
    queryKey: tripQueryKeys.predictionWorkflow(predictionId),
    queryFn: () => fetchPredictionWorkflow(predictionId),
    staleTime: options.staleTime ?? 60 * 1000,
    enabled: (options.enabled ?? true) && Boolean(predictionId),
  });
}

export function useUpdateTaskMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, patch }) => updateTask(taskId, patch),
    onSuccess: async (updatedTask) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trip", "tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["trip", "patients"] }),
        queryClient.invalidateQueries({ queryKey: ["trip", "dashboard"] }),
      ]);

      if (typeof options.onSuccess === "function") {
        options.onSuccess(updatedTask);
      }
    },
  });
}

export function useOverridePredictionMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ predictionId, payload }) =>
      overridePrediction(predictionId, payload),
    onSuccess: async (updatedPrediction) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["trip", "predictions", "history"],
        }),
        queryClient.invalidateQueries({ queryKey: ["trip", "patients"] }),
        queryClient.invalidateQueries({ queryKey: ["trip", "alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["trip", "dashboard"] }),
      ]);

      if (typeof options.onSuccess === "function") {
        options.onSuccess(updatedPrediction);
      }
    },
  });
}

export function useAcknowledgeAlertMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId) => acknowledgeAlert(alertId),
    onSuccess: async (updatedAlert) => {
      await queryClient.invalidateQueries({ queryKey: ["trip", "alerts"] });

      if (typeof options.onSuccess === "function") {
        options.onSuccess(updatedAlert);
      }
    },
  });
}

export function useResolveAlertMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId) => resolveAlert(alertId),
    onSuccess: async (updatedAlert) => {
      await queryClient.invalidateQueries({ queryKey: ["trip", "alerts"] });

      if (typeof options.onSuccess === "function") {
        options.onSuccess(updatedAlert);
      }
    },
  });
}
