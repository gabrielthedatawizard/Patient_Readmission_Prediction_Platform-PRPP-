import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { usePatient } from "./PatientProvider";
import { getTaskQueryFiltersForRole, shouldHydrateTaskWorkspace } from "../services/roleAccess";
import { mapApiTasksToUiTasks } from "../services/uiMappers";
import {
  getOfflineTasks,
  saveTasksOffline,
  getQueuedSyncOperations,
} from "../services/offlineStorage";
import { flushSyncQueue, queueTaskStatusUpdate } from "../services/syncService";
import { trackEvent } from "../services/analytics";
import { useI18n } from "./I18nProvider";
import { useTasksQuery, useUpdateTaskMutation } from "../hooks/useTrip";

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();
  const { patients } = usePatient();
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [isUsingOfflineTasks, setIsUsingOfflineTasks] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const taskQueryFilters = useMemo(() => getTaskQueryFiltersForRole(userRole), [userRole]);
  const canHydrateTaskWorkspace = isAuthenticated && shouldHydrateTaskWorkspace(userRole);
  const tasksQuery = useTasksQuery(taskQueryFilters, { enabled: canHydrateTaskWorkspace });
  const updateTaskMutation = useUpdateTaskMutation();

  const normalizeTaskDueDate = useCallback((rawDueDate) => {
    if (rawDueDate instanceof Date && !Number.isNaN(rawDueDate.getTime())) {
      return rawDueDate;
    }
    const parsed = new Date(rawDueDate || Date.now());
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, []);

  const normalizeTaskRecord = useCallback(
    (task = {}) => ({
      ...task,
      dueDate: normalizeTaskDueDate(task.dueDate),
    }),
    [normalizeTaskDueDate],
  );

  const normalizeTaskCollection = useCallback(
    (taskList = []) => (taskList || []).map((t) => normalizeTaskRecord(t)),
    [normalizeTaskRecord],
  );

  const liveTasks = useMemo(
    () =>
      normalizeTaskCollection(
        mapApiTasksToUiTasks(tasksQuery.data || [], patients),
      ),
    [normalizeTaskCollection, patients, tasksQuery.data],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setTasks([]);
      setIsTasksLoading(false);
      setTaskError("");
      setIsUsingOfflineTasks(false);
      setPendingSyncCount(0);
      return;
    }

    if (!canHydrateTaskWorkspace) {
      setTasks([]);
      setIsTasksLoading(false);
      setTaskError("");
      setIsUsingOfflineTasks(false);
      setPendingSyncCount(0);
      return;
    }

    setIsTasksLoading((tasksQuery.isLoading || tasksQuery.isFetching) && !tasks.length);

    if (tasksQuery.isSuccess) {
      setTasks(liveTasks);
      setIsTasksLoading(false);
      setTaskError("");
      setIsUsingOfflineTasks(false);
      saveTasksOffline(liveTasks).catch((offlineError) => {
        console.warn("Failed to persist offline task snapshot:", offlineError);
      });
    }
  }, [
    isAuthenticated,
    canHydrateTaskWorkspace,
    liveTasks,
    tasks.length,
    tasksQuery.isFetching,
    tasksQuery.isLoading,
    tasksQuery.isSuccess,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !canHydrateTaskWorkspace || !tasksQuery.error || tasksQuery.isSuccess) {
      return;
    }

    let disposed = false;

    const loadOfflineSnapshot = async () => {
      try {
        const offlineTasks = await getOfflineTasks();
        if (disposed) {
          return;
        }

        if (offlineTasks.length) {
          setTasks(normalizeTaskCollection(offlineTasks));
          setTaskError(
            `Live task data unavailable (${tasksQuery.error?.message || "request failed"}). Showing the latest offline snapshot.`,
          );
          setIsUsingOfflineTasks(true);
          setIsTasksLoading(false);
          return;
        }
      } catch (offlineError) {
        // Offline cache may not be available
      }

      if (!disposed) {
        setTasks([]);
        setTaskError(tasksQuery.error?.message || "Unable to load operational tasks.");
        setIsUsingOfflineTasks(false);
        setIsTasksLoading(false);
      }
    };

    loadOfflineSnapshot();

    return () => {
      disposed = true;
    };
  }, [canHydrateTaskWorkspace, isAuthenticated, normalizeTaskCollection, tasksQuery.error, tasksQuery.isSuccess]);

  const loadTasks = useCallback(async () => {
    if (!canHydrateTaskWorkspace) {
      return [];
    }

    const result = await tasksQuery.refetch();
    const refreshed = normalizeTaskCollection(
      mapApiTasksToUiTasks(result.data || [], patients),
    );
    setTasks(refreshed);
    return refreshed;
  }, [canHydrateTaskWorkspace, normalizeTaskCollection, patients, tasksQuery]);

  const handleTaskUpdate = useCallback(
    async (task, status, pushNotification) => {
      setTasks((prev) =>
        prev.map((entry) =>
          entry.id === task.id ? { ...entry, status } : entry,
        ),
      );

      try {
        if (!navigator.onLine) {
          throw new Error("offline");
        }

        const updated = await updateTaskMutation.mutateAsync({
          taskId: task.id,
          patch: { status },
        });
        if (!updated) return;

        setTasks((prev) =>
          prev.map((entry) =>
            entry.id === updated.id
              ? {
                  ...entry,
                  ...updated,
                  dueDate: updated.dueDate
                    ? new Date(updated.dueDate)
                    : entry.dueDate,
                }
              : entry,
          ),
        );
        setTaskError("");

        trackEvent("Task", "StatusUpdate", `${updated.id}:${updated.status}`);
      } catch (error) {
        const shouldQueue = !error?.status || !navigator.onLine;
        if (!shouldQueue) throw error;

        await queueTaskStatusUpdate({ taskId: task.id, status });
        const queued = await getQueuedSyncOperations();
        setPendingSyncCount(queued.length);
        if (pushNotification) {
          pushNotification({
            tone: "blue",
            title: t("taskUpdateQueued"),
            body: `${task.title} will sync when online.`,
          });
        }
      }
    },
    [t, updateTaskMutation],
  );

  // Replay offline sync queue on reconnect
  useEffect(() => {
    if (!isAuthenticated || !canHydrateTaskWorkspace) return undefined;

    let disposed = false;

    const refreshQueueStatus = async () => {
      try {
        const queued = await getQueuedSyncOperations();
        if (!disposed) setPendingSyncCount(queued.length);
      } catch (error) {
        if (!disposed) setPendingSyncCount(0);
      }
    };

    const replayQueue = async () => {
      if (!navigator.onLine) {
        await refreshQueueStatus();
        return;
      }

      try {
        const result = await flushSyncQueue();
        if (!disposed) setPendingSyncCount(result.remaining);
      } catch (error) {
        await refreshQueueStatus();
      }
    };

    replayQueue();
    const onlineHandler = () => replayQueue();
    window.addEventListener("online", onlineHandler);

    return () => {
      disposed = true;
      window.removeEventListener("online", onlineHandler);
    };
  }, [canHydrateTaskWorkspace, isAuthenticated]);

  const urgentTasks = useMemo(() => {
    return tasks
      .map((t) => normalizeTaskRecord(t))
      .filter((t) => t.status !== "completed")
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 3);
  }, [normalizeTaskRecord, tasks]);

  const completedTaskCount = useMemo(
    () => tasks.filter((t) => t.status === "completed").length,
    [tasks],
  );

  const interventionRate = useMemo(
    () => (tasks.length ? Math.round((completedTaskCount / tasks.length) * 100) : 100),
    [completedTaskCount, tasks.length],
  );

  const value = useMemo(
    () => ({
      tasks,
      setTasks,
      urgentTasks,
      isTasksLoading,
      taskError,
      isUsingOfflineTasks,
      pendingSyncCount,
      setPendingSyncCount,
      loadTasks,
      handleTaskUpdate,
      normalizeTaskRecord,
      normalizeTaskDueDate,
      normalizeTaskCollection,
      interventionRate,
    }),
    [
      tasks,
      urgentTasks,
      isTasksLoading,
      taskError,
      isUsingOfflineTasks,
      pendingSyncCount,
      loadTasks,
      handleTaskUpdate,
      normalizeTaskRecord,
      normalizeTaskDueDate,
      normalizeTaskCollection,
      interventionRate,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTask must be used within TaskProvider");
  }
  return context;
};

export default TaskContext;
