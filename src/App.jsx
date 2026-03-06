import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  Bell,
  Globe,
  ChevronRight,
  BarChart3,
  Database,
  Filter,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from "lucide-react";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// Components
import Card from "./components/common/Card";
import Badge from "./components/common/Badge";
import Button from "./components/common/Button";
import KPICard from "./components/common/KPICard";
import RiskScoreDisplay from "./components/common/RiskScoreDisplay";
import DashboardHeader from "./components/dashboard/DashboardHeader";
import QuickActions from "./components/dashboard/QuickActions";
import RecentActivity from "./components/dashboard/RecentActivity";
import PatientsList from "./components/patient/PatientsList";
import Tasks from "./components/dashboard/Tasks";
import Sidebar from "./components/layout/Sidebar";
import PageTransition from "./components/PageTransition";
import ThemeToggle from "./components/ThemeToggle";
import Grid from "./design-system/layout/Grid";
import { PatientCardSkeleton, Skeleton } from "./design-system/components/Skeleton";
import useKeyboardShortcut from "./hooks/useKeyboardShortcut";

// Data
import { SAMPLE_FACILITIES } from "./data/facilities";
import { useI18n } from "./context/I18nProvider";
import {
  acknowledgeAlert,
  clearSession,
  fetchAlerts,
  fetchCurrentUser,
  fetchLatestPrediction,
  fetchPatients,
  fetchTasks,
  logout as logoutRequest,
  resolveAlert,
  updateTask,
} from "./services/apiClient";
import wsClient from "./services/websocket";
import {
  mapApiPatientsToUiPatients,
  mapApiTasksToUiTasks,
} from "./services/uiMappers";
import {
  getOfflinePatients,
  getOfflineTasks,
  getQueuedSyncOperations,
  savePatientsOffline,
  saveTasksOffline,
} from "./services/offlineStorage";
import { trackEvent, trackPageView } from "./services/analytics";
import { isFeatureEnabled } from "./services/featureFlags";
import { flushSyncQueue, queueTaskStatusUpdate } from "./services/syncService";
import {
  getExperimentVariant,
  trackExperimentExposure,
} from "./services/experiments";

/**
 * TRIP Platform - Main Application
 * Tanzania Readmission Intelligence Platform
 */

const ROLE_TRANSLATION_KEYS = {
  moh: "mohAdmin",
  rhmt: "rhmt",
  chmt: "chmt",
  "facility-manager": "facilityManager",
  clinician: "clinician",
  nurse: "nurse",
  pharmacist: "pharmacist",
  hro: "hro",
  chw: "chw",
  "ml-engineer": "mlEngineer",
  "data-steward": "mlEngineer",
};

const DEFAULT_FACILITY = SAMPLE_FACILITIES[0] || {
  name: "TRIP Facility",
  region: "Unknown",
  district: "Unknown",
};

const Analytics = lazy(() => import("./components/analytics/Analytics"));
const DischargeWorkflow = lazy(() => import("./components/discharge/DischargeWorkflow"));
const PatientDetail = lazy(() => import("./components/patient/PatientDetail"));
const MoHNationalDashboard = lazy(() => import("./dashboards/MoHNationalDashboard"));
const RHMTDashboard = lazy(() => import("./dashboards/RHMTDashboard"));
const CHMTDashboard = lazy(() => import("./dashboards/CHMTDashboard"));
const FacilityManagerDashboard = lazy(() => import("./dashboards/FacilityManagerDashboard"));
const ClinicianDashboard = lazy(() => import("./dashboards/ClinicianDashboard"));
const NurseDashboard = lazy(() => import("./dashboards/NurseDashboard"));
const CHWDashboard = lazy(() => import("./dashboards/CHWDashboard"));
const PharmacistDashboard = lazy(() => import("./dashboards/PharmacistDashboard"));
const HRODashboard = lazy(() => import("./dashboards/HRODashboard"));
const MLEngineerDashboard = lazy(() => import("./dashboards/MLEngineerDashboard"));

const App = () => {
  const initialNotifications = [
    {
      id: "seed-1",
      tone: "red",
      titleKey: "notificationHighRiskPatient",
      bodyKey: "notificationHighRiskPatientBody",
    },
    {
      id: "seed-2",
      tone: "blue",
      titleKey: "notificationFollowupDue",
      bodyKey: "notificationFollowupDueBody",
    },
    {
      id: "seed-3",
      tone: "emerald",
      titleKey: "notificationDataQualityImproved",
      bodyKey: "notificationDataQualityImprovedBody",
    },
  ];

  const [currentPage, setCurrentPage] = useState("landing");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [alertActionId, setAlertActionId] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(DEFAULT_FACILITY);
  const [patients, setPatients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [isUsingOfflineData, setIsUsingOfflineData] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { language, setLanguage, t } = useI18n();
  const dashboardKpiVariant = useMemo(
    () => getExperimentVariant("dashboardKpiOrder", currentUser?.id || "anonymous"),
    [currentUser?.id],
  );

  const pushNotification = useCallback((notification) => {
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tone: notification.tone || "blue",
      title: notification.title || "",
      body: notification.body || "",
      createdAt: notification.createdAt || new Date().toISOString(),
      titleKey: notification.titleKey,
      bodyKey: notification.bodyKey,
    };

    setNotifications((previous) => [record, ...previous].slice(0, 25));
  }, []);

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
    (taskList = []) => (taskList || []).map((task) => normalizeTaskRecord(task)),
    [normalizeTaskRecord],
  );

  const normalizeAlertRecord = useCallback((alert = {}) => {
    const createdAt = alert.createdAt || alert.generatedAt || new Date().toISOString();

    return {
      ...alert,
      id: alert.id || `alert-${alert.predictionId || Date.now()}`,
      patientId: alert.patientId || "Unknown",
      score: Number(alert.score || 0),
      threshold: Number(alert.threshold || 80),
      tier: alert.tier || "High",
      status: alert.status || "open",
      createdAt,
      channels: Array.isArray(alert.channels) ? alert.channels : [],
    };
  }, []);

  const upsertRiskAlert = useCallback(
    (incomingAlert) => {
      const normalizedAlert = normalizeAlertRecord(incomingAlert);
      if (normalizedAlert.status === "resolved") {
        setRiskAlerts((previous) =>
          previous.filter((alert) => alert.id !== normalizedAlert.id),
        );
        return;
      }

      setRiskAlerts((previous) => {
        const merged = [
          normalizedAlert,
          ...previous.filter((alert) => alert.id !== normalizedAlert.id),
        ];
        return merged
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          )
          .slice(0, 50);
      });
    },
    [normalizeAlertRecord],
  );

  const loadRiskAlerts = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsAlertsLoading(true);
    setAlertsError("");
    try {
      const alerts = await fetchAlerts({ limit: 30 });
      setRiskAlerts(
        (alerts || [])
          .map((alert) => normalizeAlertRecord(alert))
          .filter((alert) => alert.status !== "resolved"),
      );
    } catch (error) {
      if (error?.status === 403) {
        setRiskAlerts([]);
        setAlertsError("");
        return;
      }
      setAlertsError(error?.message || "Unable to load risk alerts.");
    } finally {
      setIsAlertsLoading(false);
    }
  }, [isAuthenticated, normalizeAlertRecord]);

  const handleAcknowledgeAlert = useCallback(
    async (alertId) => {
      setAlertActionId(`ack:${alertId}`);
      setAlertsError("");
      try {
        const updated = await acknowledgeAlert(alertId);
        if (updated) {
          upsertRiskAlert(updated);
        }
        pushNotification({
          tone: "blue",
          title: "Risk alert acknowledged",
          body: `Alert ${alertId} marked as acknowledged.`,
        });
      } catch (error) {
        setAlertsError(error?.message || "Unable to acknowledge alert.");
      } finally {
        setAlertActionId(null);
      }
    },
    [pushNotification, upsertRiskAlert],
  );

  const handleResolveAlert = useCallback(
    async (alertId) => {
      setAlertActionId(`resolve:${alertId}`);
      setAlertsError("");
      try {
        const updated = await resolveAlert(alertId);
        if (updated?.id) {
          setRiskAlerts((previous) =>
            previous.filter((alert) => alert.id !== updated.id),
          );
        }
        pushNotification({
          tone: "emerald",
          title: "Risk alert resolved",
          body: `Alert ${alertId} has been resolved.`,
        });
      } catch (error) {
        setAlertsError(error?.message || "Unable to resolve alert.");
      } finally {
        setAlertActionId(null);
      }
    },
    [pushNotification],
  );

  const resolveRiskTier = (tier) => {
    const normalized = (tier || "").toLowerCase();

    if (normalized === "high") {
      return t("highRisk");
    }

    if (normalized === "medium") {
      return t("mediumRisk");
    }

    if (normalized === "low") {
      return t("lowRisk");
    }

    return `${tier || "Unknown"} ${t("riskSuffix")}`;
  };

  const loadOperationalData = useCallback(async () => {
    setIsDataLoading(true);
    setDataError("");

    try {
      const [apiPatients, apiTasks] = await Promise.all([
        fetchPatients(),
        fetchTasks(),
      ]);

      const predictions = await Promise.all(
        apiPatients.map(async (patient) => {
          try {
            const latestPrediction = await fetchLatestPrediction(patient.id);
            return [patient.id, latestPrediction];
          } catch (error) {
            return [patient.id, null];
          }
        }),
      );

      const predictionByPatientId = Object.fromEntries(predictions);
      const mappedPatients = mapApiPatientsToUiPatients(
        apiPatients,
        apiTasks,
        predictionByPatientId,
      );
      const mappedTasks = mapApiTasksToUiTasks(apiTasks, mappedPatients);
      const normalizedTasks = normalizeTaskCollection(mappedTasks);

      setPatients(mappedPatients);
      setTasks(normalizedTasks);
      setSelectedPatient((previous) => {
        if (!previous) {
          return null;
        }
        return mappedPatients.find((patient) => patient.id === previous.id) || null;
      });

      if (apiPatients.length > 0) {
        const facility = apiPatients[0]?.facility || {};
        setSelectedFacility({
          name: facility.name || mappedPatients[0]?.facility || DEFAULT_FACILITY.name,
          region: facility.regionCode || currentUser?.regionCode || DEFAULT_FACILITY.region,
          district: facility.district || DEFAULT_FACILITY.district,
        });
      } else if (currentUser?.facilityId) {
        setSelectedFacility((previous) => ({
          ...previous,
          name: currentUser.facilityId,
          region: currentUser.regionCode || previous.region,
        }));
      }

      setIsUsingOfflineData(false);
      try {
        await Promise.all([
          savePatientsOffline(mappedPatients),
          saveTasksOffline(normalizedTasks),
        ]);
      } catch (offlineError) {
        // eslint-disable-next-line no-console
        console.warn("Failed to persist offline snapshot:", offlineError);
      }
    } catch (error) {
      try {
        const [offlinePatients, offlineTasks] = await Promise.all([
          getOfflinePatients(),
          getOfflineTasks(),
        ]);

        if (offlinePatients.length || offlineTasks.length) {
          const normalizedOfflineTasks = normalizeTaskCollection(offlineTasks);
          setPatients(offlinePatients);
          setTasks(normalizedOfflineTasks);
          setSelectedPatient((previous) => {
            if (!previous) {
              return null;
            }
            return (
              offlinePatients.find((patient) => patient.id === previous.id) || null
            );
          });
          setIsUsingOfflineData(true);
          setDataError(
            `Live data unavailable (${error?.message || "request failed"}). Showing the latest offline snapshot.`,
          );
          return;
        }
      } catch (offlineError) {
        // Offline cache may not be available in all browser contexts.
      }

      setDataError(error?.message || "Unable to load operational data.");
      setPatients([]);
      setTasks([]);
      setIsUsingOfflineData(false);
    } finally {
      setIsDataLoading(false);
    }
  }, [currentUser, normalizeTaskCollection]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
        setUserRole(user.role);
        setIsAuthenticated(true);
        setCurrentPage("dashboard");
        setCurrentView("dashboard");
      } catch (error) {
        clearSession();
      } finally {
        setIsBootstrapping(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadOperationalData();
  }, [isAuthenticated, loadOperationalData]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRiskAlerts([]);
      return;
    }

    loadRiskAlerts();
  }, [isAuthenticated, loadRiskAlerts]);

  useEffect(() => {
    if (!isAuthenticated || !showNotifications) {
      return;
    }

    loadRiskAlerts();
  }, [isAuthenticated, showNotifications, loadRiskAlerts]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    trackPageView(`/${currentView}`);
  }, [currentView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let disposed = false;

    const refreshQueueStatus = async () => {
      try {
        const queued = await getQueuedSyncOperations();
        if (!disposed) {
          setPendingSyncCount(queued.length);
        }
      } catch (error) {
        if (!disposed) {
          setPendingSyncCount(0);
        }
      }
    };

    const replayQueue = async () => {
      if (!navigator.onLine) {
        await refreshQueueStatus();
        return;
      }

      try {
        const result = await flushSyncQueue();
        if (!disposed) {
          setPendingSyncCount(result.remaining);
        }
        if (result.flushed > 0) {
          loadOperationalData();
        }
      } catch (error) {
        await refreshQueueStatus();
      }
    };

    replayQueue();
    const onlineHandler = () => {
      replayQueue();
    };
    window.addEventListener("online", onlineHandler);

    return () => {
      disposed = true;
      window.removeEventListener("online", onlineHandler);
    };
  }, [isAuthenticated, loadOperationalData]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) {
      return;
    }

    trackExperimentExposure(
      "dashboardKpiOrder",
      dashboardKpiVariant,
      currentUser.id,
    );
  }, [dashboardKpiVariant, currentUser?.id, isAuthenticated]);

  useKeyboardShortcut(
    "k",
    () => {
      if (!isAuthenticated) {
        return;
      }
      setCurrentView("patients");
    },
  );

  useKeyboardShortcut(
    "/",
    () => {
      if (!isAuthenticated) {
        return;
      }
      setShowNotifications((previous) => !previous);
    },
  );

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) {
      return undefined;
    }

    wsClient.connect({ userId: currentUser.id });

    const unsubscribePrediction = wsClient.subscribe(
      "PREDICTION_GENERATED",
      (prediction) => {
        if (!prediction?.patientId) {
          return;
        }
        setPatients((previous) =>
          previous.map((patient) =>
            patient.id === prediction.patientId
              ? {
                  ...patient,
                  riskScore: prediction.score ?? patient.riskScore,
                  riskTier: prediction.tier ?? patient.riskTier,
                  riskConfidence: prediction.confidence ?? patient.riskConfidence,
                }
              : patient,
          ),
        );

        pushNotification({
          tone: "red",
          title: "New prediction generated",
          body: `Patient ${prediction.patientId} scored ${prediction.score ?? "--"}`,
        });
      },
    );

    const normalizeRealtimeTaskStatus = (status) => {
      if (status === "done") {
        return "completed";
      }
      if (status === "in-progress") {
        return "in-progress";
      }
      return status || "pending";
    };

    const unsubscribeTask = wsClient.subscribe("TASK_ASSIGNED", (task) => {
      if (!task?.id && !task?.taskId) {
        return;
      }
      const taskId = task.id || task.taskId;
      const mergedTask = normalizeTaskRecord({
        id: taskId,
        title: task.title || "New task assigned",
        patientId: task.patientId || null,
        category: task.category || "followup",
        priority: task.priority || "medium",
        status: normalizeRealtimeTaskStatus(task.status),
        dueDate: task.dueDate || Date.now() + 24 * 60 * 60 * 1000,
      });
      setTasks((previous) => [mergedTask, ...previous.filter((entry) => entry.id !== taskId)]);
      pushNotification({
        tone: "blue",
        title: "Task assigned",
        body: task.title || "A new task was assigned.",
      });
    });

    const unsubscribeTaskUpdated = wsClient.subscribe("TASK_UPDATED", (task) => {
      const taskId = task?.id || task?.taskId;
      if (!taskId) {
        return;
      }

      setTasks((previous) =>
        previous.map((entry) =>
              entry.id === taskId
                ? {
                    ...entry,
                    status: normalizeRealtimeTaskStatus(task.status),
                    dueDate: task.dueDate ? normalizeTaskDueDate(task.dueDate) : entry.dueDate,
                  }
                : entry,
            ),
        );
      });

    const unsubscribeRiskAlert = wsClient.subscribe("RISK_ALERT", (alert) => {
      if (!alert?.patientId) {
        return;
      }

      upsertRiskAlert({
        ...alert,
        status: alert.status || "open",
        createdAt: alert.createdAt || alert.generatedAt || new Date().toISOString(),
      });

      pushNotification({
        tone: "red",
        title: "High-risk alert dispatched",
        body: `Patient ${alert.patientId} scored ${alert.score ?? "--"} (threshold ${alert.threshold ?? "--"}).`,
      });
    });

    const unsubscribeRiskAlertUpdated = wsClient.subscribe("RISK_ALERT_UPDATED", (alert) => {
      if (!alert?.id) {
        return;
      }

      if (alert.status === "resolved") {
        setRiskAlerts((previous) =>
          previous.filter((entry) => entry.id !== alert.id),
        );
        return;
      }

      upsertRiskAlert(alert);
    });

    return () => {
      unsubscribePrediction?.();
      unsubscribeTask?.();
      unsubscribeTaskUpdated?.();
      unsubscribeRiskAlert?.();
      unsubscribeRiskAlertUpdated?.();
      wsClient.disconnect();
    };
  }, [
    isAuthenticated,
    currentUser?.id,
    normalizeTaskDueDate,
    normalizeTaskRecord,
    pushNotification,
    upsertRiskAlert,
  ]);

  const dashboardStats = useMemo(() => {
    const totalPatients = patients.length;
    const highRiskCount = patients.filter(
      (patient) => String(patient.riskTier).toLowerCase() === "high",
    ).length;
    const mediumRiskCount = patients.filter(
      (patient) => String(patient.riskTier).toLowerCase() === "medium",
    ).length;
    const lowRiskCount = patients.filter(
      (patient) => String(patient.riskTier).toLowerCase() === "low",
    ).length;
    const averageLosRaw =
      totalPatients === 0
        ? 0
        : patients.reduce(
            (accumulator, patient) =>
              accumulator + Number(patient.lengthOfStay || 0),
            0,
          ) / totalPatients;
    const averageLos = Number(averageLosRaw.toFixed(1));
    const completedTasks = tasks.filter(
      (task) => task.status === "completed",
    ).length;
    const interventionRate = tasks.length
      ? Math.round((completedTasks / tasks.length) * 100)
      : 100;
    const readmissionRate = totalPatients
      ? ((highRiskCount / totalPatients) * 100).toFixed(1)
      : "0.0";

    return {
      totalPatients,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      averageLos,
      interventionRate,
      readmissionRate,
    };
  }, [patients, tasks]);

  const recentActivity = useMemo(() => {
    const alertItems = riskAlerts.slice(0, 3).map((alert) => ({
      type: "alert",
      icon: AlertCircle,
      title: `High-risk alert for ${alert.patientId}`,
      description: `Score ${alert.score} crossed the ${alert.threshold} threshold.`,
      timestamp: alert.createdAt,
      surfaceClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300",
    }));

    const notificationItems = notifications.slice(0, 3).map((notification) => ({
      type: "notification",
      icon: Bell,
      title: notification.title || "Operational update",
      description: notification.body || "A new platform update is available for review.",
      timestamp: notification.createdAt || new Date().toISOString(),
      surfaceClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300",
    }));

    const taskItems = [...tasks]
      .sort(
        (left, right) =>
          new Date(left.dueDate || Date.now()).getTime() -
          new Date(right.dueDate || Date.now()).getTime(),
      )
      .slice(0, 3)
      .map((task) => ({
        type: "task",
        icon: CheckCircle,
        title: task.title || "Task queued",
        description: `Status: ${String(task.status || "pending").replace(/-/g, " ")}`,
        timestamp: task.updatedAt || task.createdAt || task.dueDate || new Date().toISOString(),
        surfaceClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
      }));

    return [...alertItems, ...notificationItems, ...taskItems]
      .sort(
        (left, right) =>
          new Date(right.timestamp || Date.now()).getTime() -
          new Date(left.timestamp || Date.now()).getTime(),
      )
      .slice(0, 6);
  }, [notifications, riskAlerts, tasks]);

  const urgentTasks = useMemo(() => {
    return tasks
      .map((task) => normalizeTaskRecord(task))
      .filter((task) => task.status !== "completed")
      .sort((first, second) => first.dueDate - second.dueDate)
      .slice(0, 3);
  }, [normalizeTaskRecord, tasks]);

  const navigationItems = [
    { id: "dashboard", label: t("dashboard"), icon: BarChart3, roles: ["all"] },
    { id: "patients", label: t("patients"), icon: Users, roles: ["all"] },
    { id: "tasks", label: t("tasks"), icon: CheckCircle, roles: ["all"] },
    {
      id: "discharge",
      label: t("discharge"),
      icon: FileText,
      roles: ["clinician", "nurse", "facility-manager"],
    },
    {
      id: "analytics",
      label: t("analytics"),
      icon: TrendingUp,
      roles: ["facility-manager", "chmt", "rhmt", "moh"],
    },
    {
      id: "data-quality",
      label: t("dataQuality"),
      icon: Database,
      roles: ["hro", "facility-manager", "ml-engineer", "data-steward"],
      featureFlag: "dataQualityDashboard",
    },
  ];

  const filteredNavItems = navigationItems.filter(
    (item) =>
      (item.roles.includes("all") || item.roles.includes(userRole)) &&
      (!item.featureFlag || isFeatureEnabled(item.featureFlag)),
  );

  const roleLabel = ROLE_TRANSLATION_KEYS[userRole]
    ? t(ROLE_TRANSLATION_KEYS[userRole])
    : (userRole || "").replace("-", " ");

  const handleLogin = (session) => {
    trackEvent("Session", "Login", session?.user?.role || "unknown");
    setCurrentUser(session.user);
    setUserRole(session.user.role);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
    setCurrentView("dashboard");
  };

  const handleLogout = async () => {
    trackEvent("Session", "Logout", currentUser?.role || "unknown");
    try {
      await logoutRequest();
    } catch (error) {
      // Continue with local cleanup even when the server is unreachable.
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
      setCurrentUser(null);
      setCurrentPage("landing");
      setCurrentView("dashboard");
      setSelectedPatient(null);
      setPatients([]);
      setTasks([]);
      setRiskAlerts([]);
      setAlertsError("");
      setIsUsingOfflineData(false);
    }
  };

  const handleOpenSettings = () => {
    setSelectedPatient(null);
    setCurrentView("settings");
    setIsMobileSidebarOpen(false);
  };

  const quickActions = useMemo(
    () => [
      {
        id: "patients",
        icon: Users,
        label: language === "sw" ? "Wagonjwa" : "Patient list",
        description:
          language === "sw"
            ? "Pitia wagonjwa walio katika uangalizi wako."
            : "Review the current caseload and handoffs.",
        colorClass: "bg-gradient-to-br from-sky-500 to-blue-600",
        accentClass: "bg-sky-500",
        onClick: () => setCurrentView("patients"),
      },
      {
        id: "predict",
        icon: Activity,
        label: language === "sw" ? "Alama ya hatari" : "Generate risk score",
        description:
          language === "sw"
            ? "Fungua discharge workflow kwa mgonjwa aliyeteuliwa."
            : "Jump into the discharge workflow for the active patient.",
        colorClass: "bg-gradient-to-br from-violet-500 to-fuchsia-600",
        accentClass: "bg-violet-500",
        onClick: () => {
          const targetPatient = selectedPatient || patients[0] || null;
          if (targetPatient) {
            setSelectedPatient(targetPatient);
            setCurrentView("discharge");
            return;
          }
          setCurrentView("patients");
        },
      },
      {
        id: "analytics",
        icon: BarChart3,
        label: language === "sw" ? "Takwimu" : "View analytics",
        description:
          language === "sw"
            ? "Angalia mwenendo wa kituo na utendaji."
            : "Inspect facility trends and intervention performance.",
        colorClass: "bg-gradient-to-br from-emerald-500 to-teal-600",
        accentClass: "bg-emerald-500",
        onClick: () => setCurrentView("analytics"),
      },
      {
        id: "tasks",
        icon: CheckCircle,
        label: language === "sw" ? "Majukumu" : "Task queue",
        description:
          language === "sw"
            ? "Kamilisha kazi za uingiliaji na follow-up."
            : "Work through the next intervention and follow-up tasks.",
        colorClass: "bg-gradient-to-br from-amber-500 to-orange-500",
        accentClass: "bg-amber-500",
        onClick: () => setCurrentView("tasks"),
      },
    ],
    [language, patients, selectedPatient],
  );

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6 pt-10">
          <Skeleton variant="title" className="w-1/3" />
          <Grid cols={3} gap={4}>
            <PatientCardSkeleton />
            <PatientCardSkeleton />
            <PatientCardSkeleton />
          </Grid>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && currentPage === "landing") {
    return <LandingPage onLogin={() => setCurrentPage("login")} />;
  }

  if (!isAuthenticated && currentPage === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => setCurrentPage("landing")}
      />
    );
  }

  const Dashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300 mb-2">
            Operational snapshot
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">
            Facility discharge pulse
          </h1>
          <p className="text-gray-600 dark:text-slate-300">
            {selectedFacility.name} | {selectedFacility.region} | {selectedFacility.district}
          </p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          <select className="w-full sm:w-auto px-4 py-2 border-2 border-gray-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm font-medium focus:border-teal-500 outline-none">
            <option value="7d">{t("last7Days")}</option>
            <option value="30d">{t("last30Days")}</option>
            <option value="90d">{t("last90Days")}</option>
            <option value="custom">{t("customRange")}</option>
          </select>
        </div>
      </div>

      {dataError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Could not load live clinical data
                </p>
                <p className="text-xs text-red-700 mt-1">{dataError}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-red-700 hover:bg-red-100"
              onClick={loadOperationalData}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {isUsingOfflineData && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-amber-700 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Offline snapshot mode
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Updates are paused until connectivity is restored. You can still
                review cached patients and tasks.
              </p>
            </div>
          </div>
        </Card>
      )}

      {pendingSyncCount > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-800">
            {pendingSyncCount} offline update{pendingSyncCount === 1 ? "" : "s"} queued for sync.
            Reconnect to upload changes.
          </p>
        </Card>
      )}

      <Grid cols={4} gap={6}>
        {(dashboardKpiVariant === "prioritizeInterventions"
          ? [
              {
                id: "intervention-rate",
                title: t("interventionRate"),
                value: `${dashboardStats.interventionRate}%`,
                change: t("kpiInterventionDelta"),
                trend: "up",
                icon: CheckCircle,
                color: "emerald",
              },
              {
                id: "high-risk-discharges",
                title: t("highRiskDischarges"),
                value: String(dashboardStats.highRiskCount),
                change: t("kpiHighRiskDelta"),
                trend: "down",
                icon: Activity,
                color: "red",
              },
              {
                id: "readmission-rate",
                title: t("readmissionRate"),
                value: `${dashboardStats.readmissionRate}%`,
                change: t("kpiReadmissionDelta"),
                trend: "up",
                icon: TrendingUp,
                color: "teal",
              },
              {
                id: "avg-los",
                title: t("avgLengthOfStay"),
                value: `${dashboardStats.averageLos} days`,
                change: t("kpiAvgStayDelta"),
                trend: "up",
                icon: CheckCircle,
                color: "purple",
              },
            ]
          : [
              {
                id: "readmission-rate",
                title: t("readmissionRate"),
                value: `${dashboardStats.readmissionRate}%`,
                change: t("kpiReadmissionDelta"),
                trend: "up",
                icon: TrendingUp,
                color: "teal",
              },
              {
                id: "high-risk-discharges",
                title: t("highRiskDischarges"),
                value: String(dashboardStats.highRiskCount),
                change: t("kpiHighRiskDelta"),
                trend: "down",
                icon: Activity,
                color: "red",
              },
              {
                id: "avg-los",
                title: t("avgLengthOfStay"),
                value: `${dashboardStats.averageLos} days`,
                change: t("kpiAvgStayDelta"),
                trend: "up",
                icon: CheckCircle,
                color: "purple",
              },
              {
                id: "intervention-rate",
                title: t("interventionRate"),
                value: `${dashboardStats.interventionRate}%`,
                change: t("kpiInterventionDelta"),
                trend: "up",
                icon: CheckCircle,
                color: "emerald",
              },
            ]
        ).map((card) => (
          <KPICard
            key={card.id}
            title={card.title}
            value={card.value}
            change={card.change}
            trend={card.trend}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </Grid>

      {isDataLoading && (
        <Card className="p-4">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-3/5" />
            <Skeleton variant="text" className="w-2/5" />
          </div>
        </Card>
      )}

      <Grid cols={3} gap={6}>
        <Card className="lg:col-span-2 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {t("todayDischarges")}
            </h2>
            <Button
              variant="ghost"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setCurrentView("patients")}
            >
              {t("filter")}
            </Button>
          </div>

          <div className="space-y-4">
            {patients.slice(0, 4).map((patient) => (
              <div
                key={patient.id}
                className="p-4 border-2 border-gray-100 rounded-lg hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer overflow-hidden"
                onClick={() => {
                  setSelectedPatient(patient);
                  setCurrentView("patient-detail");
                }}
              >
                <div className="flex flex-col gap-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">
                        {patient.name}
                      </h3>
                      <Badge variant="default">{patient.id}</Badge>
                      <Badge variant={String(patient.riskTier).toLowerCase()}>
                        {resolveRiskTier(patient.riskTier)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {patient.age}
                      {t("ageShort")} | {patient.gender} | {patient.ward}
                    </p>
                    <p className="text-sm font-medium text-gray-700 break-words">
                      {patient.diagnosis?.primary || "Diagnosis pending"}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {(patient.interventionsNeeded || [])
                        .slice(0, 3)
                        .map((intervention, idx) => (
                          <Badge
                            key={`${patient.id}-int-${idx}`}
                            variant={
                              intervention.priority === "high"
                                ? "danger"
                                : "warning"
                            }
                            size="sm"
                          >
                            {String(intervention.type).replace(/-/g, " ")}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Risk score</p>
                    <div className="flex items-center gap-3">
                      <RiskScoreDisplay
                        score={patient.riskScore}
                        tier={patient.riskTier}
                        confidence={patient.riskConfidence}
                        size="sm"
                        showBadge={false}
                      />
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!patients.length && (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  No patients available for your current scope.
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setCurrentView("patients")}
          >
            {t("viewAllPatients")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {t("actionQueue")}
          </h2>

          <div className="space-y-4">
            {urgentTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border-2 rounded-lg bg-amber-50 border-amber-200"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {task.patient?.name || task.patientId}
                    </p>
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      Due {task.dueDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {!urgentTasks.length && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                <p className="font-semibold text-emerald-900 text-sm">
                  No pending high-priority tasks
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  All queued interventions are currently complete.
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setCurrentView("tasks")}
          >
            {t("viewAllTasks")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      </Grid>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {t("riskDistribution")}
        </h2>
        <Grid cols={3} gap={4}>
          <div className="text-center p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <p className="text-3xl sm:text-4xl font-bold text-emerald-700 mb-2">
              {dashboardStats.lowRiskCount}
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              {t("lowRisk")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("dischargeShareLow")}
            </p>
          </div>
          <div className="text-center p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
            <p className="text-3xl sm:text-4xl font-bold text-amber-700 mb-2">
              {dashboardStats.mediumRiskCount}
            </p>
            <p className="text-sm font-semibold text-amber-600">
              {t("mediumRisk")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("dischargeShareMedium")}
            </p>
          </div>
          <div className="text-center p-6 bg-red-50 rounded-xl border-2 border-red-200">
            <p className="text-3xl sm:text-4xl font-bold text-red-700 mb-2">
              {dashboardStats.highRiskCount}
            </p>
            <p className="text-sm font-semibold text-red-600">
              {t("highRisk")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("dischargeShareHigh")}
            </p>
          </div>
        </Grid>
      </Card>
    </div>
  );

  const RoleDashboard = () => {
    switch (userRole) {
      case "moh":
        return <MoHNationalDashboard />;
      case "rhmt":
        return <RHMTDashboard region={currentUser?.regionCode || selectedFacility.region} />;
      case "chmt":
        return <CHMTDashboard district={selectedFacility.district} />;
      case "facility-manager":
        return <FacilityManagerDashboard facilityId={currentUser?.facilityId} />;
      case "clinician":
        return (
          <ClinicianDashboard
            clinicianId={currentUser?.id}
            onOpenPatient={(patient) => {
              if (!patient) {
                return;
              }
              setSelectedPatient(patient);
              setCurrentView("patient-detail");
            }}
            onStartDischarge={(patient) => {
              if (!patient) {
                return;
              }
              setSelectedPatient(patient);
              setCurrentView("discharge");
            }}
          />
        );
      case "nurse":
        return <NurseDashboard nurseId={currentUser?.id} />;
      case "chw":
        return <CHWDashboard chwId={currentUser?.id} />;
      case "pharmacist":
        return <PharmacistDashboard pharmacistId={currentUser?.id} />;
      case "hro":
        return <HRODashboard facilityId={currentUser?.facilityId} />;
      case "ml-engineer":
      case "data-steward":
        return <MLEngineerDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 overflow-x-hidden dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm dark:bg-slate-950/90 dark:border-slate-800 backdrop-blur-xl">
        <div className="px-3 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsMobileSidebarOpen((open) => !open)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileSidebarOpen}
                aria-controls="app-sidebar-nav"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-slate-100" />
              </button>
              <button
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                className="hidden lg:inline-flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Collapse sidebar"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-slate-100" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-slate-100 leading-none">TRIP</h1>
                  <p className="hidden md:block text-xs text-gray-500 dark:text-slate-400">{t("appTagline")}</p>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-slate-300">{t("national")}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <span className="text-gray-600 dark:text-slate-300">{selectedFacility.region}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <span className="text-gray-600 dark:text-slate-300">{selectedFacility.district}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <span className="font-semibold text-gray-900 dark:text-slate-100">
                {selectedFacility.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="max-w-[4.75rem] px-2 py-1.5 bg-gray-100 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 sm:max-w-none sm:gap-2">
                <Globe className="w-4 h-4" />
                <label htmlFor="app-language" className="sr-only">
                  {t("languageLabel")}
                </label>
                <select
                  id="app-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="w-[2.5rem] bg-transparent outline-none text-xs sm:w-auto sm:text-sm"
                >
                  <option value="sw">SW</option>
                  <option value="en">EN</option>
                </select>
              </div>

              {currentView !== "dashboard" && <ThemeToggle />}

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label={`Open notifications (${notifications.length + riskAlerts.length})`}
              >
                <Bell className="w-5 h-5 text-gray-700 dark:text-slate-100" />
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {notifications.length + riskAlerts.length}
                </span>
              </button>

              <div className="hidden sm:flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l-2 border-gray-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {currentUser?.fullName || "TRIP User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{roleLabel}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {(currentUser?.fullName || "TR")
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex">
        <Sidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          title="Navigation"
          footer={
            (!sidebarCollapsed || isMobileSidebarOpen) && (
              <div className="p-4 mt-4 border-t-2 border-gray-200 dark:border-slate-800">
                <button
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-all"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium text-sm">{t("settings")}</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-all mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm">{t("logout")}</span>
                </button>
              </div>
            )
          }
        >
          <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
            Menu
          </div>
          <nav id="app-sidebar-nav" aria-label="Primary navigation" className="p-4 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSelectedPatient(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    w-full flex items-center ${sidebarCollapsed && !isMobileSidebarOpen ? "justify-center" : "gap-3"}
                    px-3 py-3 rounded-xl transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md"
                        : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {(!sidebarCollapsed || isMobileSidebarOpen) && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </Sidebar>

        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            {currentView === "dashboard" && (
              <>
                <DashboardHeader
                  user={currentUser}
                  facility={selectedFacility}
                  language={language}
                  notificationCount={notifications.length + riskAlerts.length}
                  onOpenNotifications={() => setShowNotifications((previous) => !previous)}
                  onOpenPatients={() => setCurrentView("patients")}
                  onOpenSettings={handleOpenSettings}
                />
                <Grid cols={1} gap={6} className="lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <QuickActions actions={quickActions} />
                  </div>
                  <div className="lg:col-span-2">
                    <RecentActivity activities={recentActivity} />
                  </div>
                </Grid>
              </>
            )}

            <Suspense fallback={<PatientCardSkeleton />}>
              <PageTransition viewKey={currentView}>
                {currentView === "dashboard" && <RoleDashboard />}

                {currentView === "patients" && (
                  <PatientsList
                    patients={patients}
                    onPatientSelect={(patient) => {
                      setSelectedPatient(patient);
                      setCurrentView("patient-detail");
                    }}
                  />
                )}

                {currentView === "patient-detail" && selectedPatient && (
                  <PatientDetail
                    patient={selectedPatient}
                    onBack={() => {
                      setSelectedPatient(null);
                      setCurrentView("patients");
                    }}
                    onStartDischarge={() => setCurrentView("discharge")}
                  />
                )}

                {currentView === "discharge" &&
                  (selectedPatient || patients[0] ? (
                    <DischargeWorkflow
                      patient={selectedPatient || patients[0]}
                      onBack={() =>
                        setCurrentView(selectedPatient ? "patient-detail" : "patients")
                      }
                      onComplete={(result) => {
                        const prediction = result?.prediction || null;
                        if (prediction && (selectedPatient || patients[0])) {
                          const patientId = (selectedPatient || patients[0]).id;
                          setPatients((previous) =>
                            previous.map((patient) =>
                              patient.id === patientId
                                ? {
                                    ...patient,
                                    riskScore: prediction.score ?? patient.riskScore,
                                    riskTier: prediction.tier ?? patient.riskTier,
                                    riskConfidence:
                                      prediction.confidence ?? patient.riskConfidence,
                                    riskFactors:
                                      prediction.factors?.length
                                        ? prediction.factors.map((factor) => ({
                                            factor: factor.factor || factor.label || "Unknown factor",
                                            weight: Number(factor.weight || factor.value || 0),
                                            category: factor.category || "clinical",
                                          }))
                                        : patient.riskFactors,
                                  }
                                : patient,
                            ),
                          );
                          setSelectedPatient((previous) =>
                            previous && previous.id === patientId
                              ? {
                                  ...previous,
                                  riskScore: prediction.score ?? previous.riskScore,
                                  riskTier: prediction.tier ?? previous.riskTier,
                                  riskConfidence:
                                    prediction.confidence ?? previous.riskConfidence,
                                  riskFactors:
                                    prediction.factors?.length
                                      ? prediction.factors.map((factor) => ({
                                          factor: factor.factor || factor.label || "Unknown factor",
                                          weight: Number(factor.weight || factor.value || 0),
                                          category: factor.category || "clinical",
                                        }))
                                      : previous.riskFactors,
                                }
                              : previous,
                          );
                        }

                        pushNotification({
                          tone: prediction ? "emerald" : "blue",
                          title: "Discharge workflow completed",
                          body: prediction
                            ? `Updated score: ${prediction.score ?? "--"} (${prediction.tier || "Unknown"})`
                            : "Discharge summary saved successfully.",
                        });
                        trackEvent("Discharge", "Complete", (selectedPatient || patients[0])?.id || "unknown");
                        setCurrentView("dashboard");
                        loadOperationalData();
                      }}
                    />
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-gray-700 dark:text-slate-200 font-semibold">
                        Select a patient first to start discharge workflow.
                      </p>
                    </Card>
                  ))}

                {currentView === "tasks" && (
                  <Tasks
                    tasks={tasks}
                    patients={patients}
                    onPatientSelect={(patient) => {
                      if (!patient) {
                        return;
                      }
                      setSelectedPatient(patient);
                      setCurrentView("patient-detail");
                    }}
                    onTaskUpdate={async (task, status) => {
                      setTasks((previous) =>
                        previous.map((entry) =>
                          entry.id === task.id
                            ? {
                                ...entry,
                                status,
                              }
                            : entry,
                        ),
                      );
                      try {
                        if (!navigator.onLine) {
                          throw new Error("offline");
                        }

                        const updated = await updateTask(task.id, { status });
                        if (!updated) {
                          return;
                        }

                        setTasks((previous) =>
                          previous.map((entry) =>
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
                        if (!shouldQueue) {
                          throw error;
                        }

                        await queueTaskStatusUpdate({
                          taskId: task.id,
                          status,
                        });
                        const queued = await getQueuedSyncOperations();
                        setPendingSyncCount(queued.length);
                        pushNotification({
                          tone: "blue",
                          title: "Task update queued",
                          body: `${task.title} will sync when online.`,
                        });
                      }
                    }}
                  />
                )}

                {currentView === "analytics" && <Analytics />}

                {currentView === "data-quality" && (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <Database className="w-10 h-10 text-gray-400 dark:text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                      {t("dataQualityDashboard")}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-300">{t("dataQualityInProgress")}</p>
                    <Button
                      variant="primary"
                      onClick={() => setCurrentView("dashboard")}
                      className="mt-6"
                    >
                      {t("backToDashboard")}
                    </Button>
                  </div>
                )}

                {currentView === "settings" && (
                  <Card className="max-w-3xl mx-auto p-8">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 mx-auto mb-5">
                      <Settings className="w-8 h-8 text-gray-500 dark:text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-center mb-2">
                      {t("settings")}
                    </h3>
                    <p className="text-center text-gray-600 dark:text-slate-300">
                      Settings controls are being finalized. Use the dashboard to continue
                      patient review and task management.
                    </p>
                    <Button
                      variant="primary"
                      className="mt-6 mx-auto flex"
                      onClick={() => setCurrentView("dashboard")}
                    >
                      {t("backToDashboard")}
                    </Button>
                  </Card>
                )}
              </PageTransition>
            </Suspense>
          </div>
        </div>
      </div>

      {showNotifications && (
        <div className="fixed top-16 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-950 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-slate-800 z-50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">{t("notifications")}</h3>
            <button
              onClick={loadRiskAlerts}
              className="inline-flex items-center gap-1 rounded-md bg-white/20 hover:bg-white/30 px-2 py-1 text-xs text-white"
              type="button"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAlertsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Active Risk Alerts
                </p>
                <Badge
                  variant={riskAlerts.length > 0 ? "danger" : "default"}
                  size="sm"
                >
                  {riskAlerts.length}
                </Badge>
              </div>

              {isAlertsLoading && (
                <div className="space-y-2">
                  {[0, 1].map((index) => (
                    <div
                      key={index}
                      className="h-16 rounded-lg border border-gray-200 bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!isAlertsLoading && alertsError && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                  {alertsError}
                </div>
              )}

              {!isAlertsLoading && !alertsError && riskAlerts.length === 0 && (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                  <p className="text-xs text-emerald-700 font-medium">
                    No open high-risk alerts.
                  </p>
                </div>
              )}

              {!isAlertsLoading && !alertsError && riskAlerts.length > 0 && (
                <div className="space-y-2">
                  {riskAlerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-red-900">
                          Patient {alert.patientId}
                        </p>
                        <Badge variant="danger" size="sm">
                          {alert.tier || "High"}
                        </Badge>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        Score {alert.score} (threshold {alert.threshold})
                      </p>
                      <p className="text-[11px] text-red-700 mt-1">
                        Status: {String(alert.status || "open").replace("-", " ")}
                      </p>
                      <p className="text-[11px] text-red-600 mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="!py-1 !px-2 text-xs"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          loading={alertActionId === `ack:${alert.id}`}
                          disabled={alert.status !== "open" || Boolean(alertActionId)}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="!py-1 !px-2 text-xs"
                          onClick={() => handleResolveAlert(alert.id)}
                          loading={alertActionId === `resolve:${alert.id}`}
                          disabled={Boolean(alertActionId)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Activity Notifications
              </p>
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const tones = {
                    red: {
                      card: "bg-red-50 border-red-200",
                      title: "text-red-900",
                      body: "text-red-700",
                    },
                    blue: {
                      card: "bg-blue-50 border-blue-200",
                      title: "text-blue-900",
                      body: "text-blue-700",
                    },
                    emerald: {
                      card: "bg-emerald-50 border-emerald-200",
                      title: "text-emerald-900",
                      body: "text-emerald-700",
                    },
                  };

                  const tone = tones[notification.tone] || tones.blue;

                  return (
                    <div key={notification.id} className={`p-3 rounded-lg border ${tone.card}`}>
                      <p className={`text-sm font-semibold ${tone.title}`}>
                        {notification.titleKey ? t(notification.titleKey) : notification.title}
                      </p>
                      <p className={`text-xs mt-1 ${tone.body}`}>
                        {notification.bodyKey ? t(notification.bodyKey) : notification.body}
                      </p>
                    </div>
                  );
                })}
                {!notifications.length && (
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-700">No notifications yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-t-2 border-gray-200 px-4 sm:px-6 py-4 text-center">
        <p className="text-xs text-gray-500">
          {t("footerPlatform")} |
          <span className="text-teal-600 font-semibold ml-1">
            {t("footerSecureTagline")}
          </span>
        </p>
      </div>
    </div>
  );
};

export default App;

