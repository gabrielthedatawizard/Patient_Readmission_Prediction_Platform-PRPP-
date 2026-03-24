import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { fetchTasks, updateTask } from "../services/apiClient";
import { mapApiTasksToUiTasks } from "../services/uiMappers";
import {
  getOfflineTasks,
  saveTasksOffline,
  getQueuedSyncOperations,
} from "../services/offlineStorage";
import { flushSyncQueue, queueTaskStatusUpdate } from "../services/syncService";
import { trackEvent } from "../services/analytics";
import { useI18n } from "./I18nProvider";

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

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

  const loadTasks = useCallback(async (mappedPatients = []) => {
    try {
      const apiTasks = await fetchTasks();
      const mappedTasks = mapApiTasksToUiTasks(apiTasks, mappedPatients);
      const normalizedTasks = normalizeTaskCollection(mappedTasks);
      setTasks(normalizedTasks);

      try {
        await saveTasksOffline(normalizedTasks);
      } catch (offlineError) {
        console.warn("Failed to persist offline task snapshot:", offlineError);
      }

      return normalizedTasks;
    } catch (error) {
      try {
        const offlineTasks = await getOfflineTasks();
        if (offlineTasks.length) {
          const normalizedOfflineTasks = normalizeTaskCollection(offlineTasks);
          setTasks(normalizedOfflineTasks);
          return normalizedOfflineTasks;
        }
      } catch (offlineError) {
        // Offline cache may not be available
      }
      setTasks([]);
      return [];
    }
  }, [normalizeTaskCollection]);

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

        const updated = await updateTask(task.id, { status });
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
    [t],
  );

  // Replay offline sync queue on reconnect
  useEffect(() => {
    if (!isAuthenticated) return undefined;

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
  }, [isAuthenticated]);

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
