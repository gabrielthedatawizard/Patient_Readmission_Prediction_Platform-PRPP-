import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import Grid from "./design-system/layout/Grid";
import { PatientCardSkeleton, Skeleton } from "./design-system/components/Skeleton";
import useKeyboardShortcut from "./hooks/useKeyboardShortcut";

// Data
import { SAMPLE_FACILITIES } from "./data/facilities";
import { useI18n } from "./context/I18nProvider";
import { useTheme } from "./context/ThemeContext";
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
const DataQualityDashboard = lazy(
  () => import("./components/analytics/DataQualityDashboard"),
);
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
      tone: "amber",
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
  const notificationPanelRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const { language, setLanguage, t } = useI18n();
  const { theme } = useTheme();
  const dashboardKpiVariant = useMemo(
    () => getExperimentVariant("dashboardKpiOrder", currentUser?.id || "anonymous"),
    [currentUser?.id],
  );
  const fillTemplate = useCallback((template, values = {}) => {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.split(`{${key}}`).join(String(value ?? "")),
      template,
    );
  }, []);
  const translateTemplate = useCallback(
    (key, values = {}, fallback = key) => fillTemplate(t(key, fallback), values),
    [fillTemplate, t],
  );
  const formatStatusLabel = useCallback(
    (status) => {
      const normalized = String(status || "").toLowerCase();

      if (normalized === "pending") return t("pending");
      if (normalized === "completed") return t("completed");
      if (normalized === "in-progress") return t("inProgress");
      if (normalized === "overdue") return t("overdue");
      if (normalized === "open") return t("openStatus");
      if (normalized === "acknowledged") {
        return language === "sw" ? "Imethibitishwa" : "Acknowledged";
      }
      if (normalized === "resolved") {
        return language === "sw" ? "Imetatuliwa" : "Resolved";
      }

      return String(status || "").replace(/-/g, " ");
    },
    [language, t],
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

  const toUiRiskFactors = useCallback((factors = []) => {
    if (!Array.isArray(factors) || factors.length === 0) {
      return null;
    }

    return factors.map((factor) => ({
      factor: factor.factor || factor.label || "Unknown factor",
      weight: Number(factor.weight || factor.value || 0),
      category: factor.category || "clinical",
    }));
  }, []);

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
      setAlertsError(error?.message || t("unableToLoadRiskAlerts"));
    } finally {
      setIsAlertsLoading(false);
    }
  }, [isAuthenticated, normalizeAlertRecord, t]);

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
          title: t("riskAlertAcknowledged"),
          body: translateTemplate("alertAcknowledgedBody", { id: alertId }),
        });
      } catch (error) {
        setAlertsError(error?.message || t("unableToAcknowledgeAlert"));
      } finally {
        setAlertActionId(null);
      }
    },
    [pushNotification, t, translateTemplate, upsertRiskAlert],
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
          title: t("riskAlertResolved"),
          body: translateTemplate("alertResolvedBody", { id: alertId }),
        });
      } catch (error) {
        setAlertsError(error?.message || t("unableToResolveAlert"));
      } finally {
        setAlertActionId(null);
      }
    },
    [pushNotification, t, translateTemplate],
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

  const handlePredictionOverridden = useCallback(
    (prediction) => {
      const patientId = prediction?.patientId;
      if (!patientId) {
        return;
      }

      const mappedFactors = toUiRiskFactors(prediction.factors);
      const nextScore = Number.isFinite(Number(prediction.score))
        ? Number(prediction.score)
        : null;
      const nextConfidence = Number.isFinite(Number(prediction.confidence))
        ? Number(prediction.confidence)
        : null;

      setPatients((previous) =>
        previous.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                riskTier: prediction.tier || patient.riskTier,
                riskScore: nextScore ?? patient.riskScore,
                riskConfidence: nextConfidence ?? patient.riskConfidence,
                riskFactors: mappedFactors || patient.riskFactors,
              }
            : patient,
        ),
      );

      setSelectedPatient((previous) =>
        previous && previous.id === patientId
          ? {
              ...previous,
              riskTier: prediction.tier || previous.riskTier,
              riskScore: nextScore ?? previous.riskScore,
              riskConfidence: nextConfidence ?? previous.riskConfidence,
              riskFactors: mappedFactors || previous.riskFactors,
            }
          : previous,
      );

      pushNotification({
        tone: "amber",
        title:
          language === "sw"
            ? "Marekebisho ya utabiri yamehifadhiwa"
            : "Prediction override saved",
        body:
          language === "sw"
            ? `Mgonjwa ${patientId} amewekwa kwenye ngazi ya ${prediction.tier || "Unknown"}.`
            : `Patient ${patientId} tier updated to ${prediction.tier || "Unknown"}.`,
      });

      trackEvent(
        "Prediction",
        "Override",
        `${patientId}:${prediction.tier || "unknown"}`,
      );
    },
    [language, pushNotification, toUiRiskFactors],
  );

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
    if (!showNotifications) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const panel = notificationPanelRef.current;
      const toggleButton = notificationButtonRef.current;
      const target = event.target;

      if (panel?.contains(target) || toggleButton?.contains(target)) {
        return;
      }

      setShowNotifications(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showNotifications]);

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
    setShowNotifications(false);
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
          title: t("newPredictionGenerated"),
          body: translateTemplate("predictionGeneratedBody", {
            id: prediction.patientId,
            score: prediction.score ?? "--",
          }),
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
        title: task.title || t("taskAssigned"),
        patientId: task.patientId || null,
        category: task.category || "followup",
        priority: task.priority || "medium",
        status: normalizeRealtimeTaskStatus(task.status),
        dueDate: task.dueDate || Date.now() + 24 * 60 * 60 * 1000,
      });
      setTasks((previous) => [mergedTask, ...previous.filter((entry) => entry.id !== taskId)]);
      pushNotification({
        tone: "blue",
        title: t("taskAssigned"),
        body: task.title || t("taskAssignedBody"),
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
        title: t("highRiskAlertDispatched"),
        body: translateTemplate("highRiskAlertDispatchedBody", {
          id: alert.patientId,
          score: alert.score ?? "--",
          threshold: alert.threshold ?? "--",
        }),
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
    t,
    translateTemplate,
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
    const toneStyles = {
      red: {
        containerClass: "border-rose-200 bg-rose-50/85",
        iconWrapClass: "bg-rose-100 text-rose-700",
        tagClass: "bg-rose-100 text-rose-700",
        timeClass: "text-rose-700",
      },
      amber: {
        containerClass: "border-amber-200 bg-amber-50/85",
        iconWrapClass: "bg-amber-100 text-amber-700",
        tagClass: "bg-amber-100 text-amber-700",
        timeClass: "text-amber-700",
      },
      blue: {
        containerClass: "border-sky-200 bg-sky-50/85",
        iconWrapClass: "bg-sky-100 text-sky-700",
        tagClass: "bg-sky-100 text-sky-700",
        timeClass: "text-sky-700",
      },
      emerald: {
        containerClass: "border-emerald-200 bg-emerald-50/85",
        iconWrapClass: "bg-emerald-100 text-emerald-700",
        tagClass: "bg-emerald-100 text-emerald-700",
        timeClass: "text-emerald-700",
      },
    };
    const getToneStyle = (tone) => toneStyles[tone] || toneStyles.blue;

    const alertItems = riskAlerts.slice(0, 3).map((alert) => ({
      type: "alert",
      icon: AlertCircle,
      tagLabel: language === "sw" ? "Hatari kubwa" : "Critical",
      title:
        language === "sw"
          ? `Tahadhari ya hatari kubwa kwa ${alert.patientId}`
          : `High-risk alert for ${alert.patientId}`,
      description:
        language === "sw"
          ? `Alama ${alert.score} imevuka kizingiti cha ${alert.threshold}.`
          : `Score ${alert.score} crossed the ${alert.threshold} threshold.`,
      timestamp: alert.createdAt,
      ...getToneStyle("red"),
    }));

    const notificationItems = notifications.slice(0, 3).map((notification) => {
      const tone = notification.tone || "blue";
      const toneStyle = getToneStyle(tone);
      const tagLabel =
        tone === "red"
          ? language === "sw"
            ? "Hatari kubwa"
            : "Critical"
          : tone === "amber"
            ? language === "sw"
              ? "Ufuatiliaji"
              : "Follow-up"
            : language === "sw"
              ? "Sasisho"
              : "Update";

      return {
        type: "notification",
        icon: tone === "red" ? AlertCircle : Bell,
        tagLabel,
        title: notification.titleKey
          ? t(notification.titleKey, notification.title || t("operationalUpdate"))
          : notification.title || t("operationalUpdate"),
        description: notification.bodyKey
          ? t(notification.bodyKey, notification.body || t("operationalUpdateBody"))
          : notification.body || t("operationalUpdateBody"),
        timestamp: notification.createdAt || new Date().toISOString(),
        ...toneStyle,
      };
    });

    const taskItems = [...tasks]
      .sort(
        (left, right) =>
          new Date(left.dueDate || Date.now()).getTime() -
          new Date(right.dueDate || Date.now()).getTime(),
      )
      .slice(0, 3)
      .map((task) => {
        const isTaskOverdue =
          new Date(task.dueDate || Date.now()).getTime() < Date.now() &&
          task.status !== "completed";
        const tone =
          isTaskOverdue || task.priority === "high"
            ? "amber"
            : task.status === "completed"
              ? "emerald"
              : "blue";

        return {
          type: "task",
          icon: isTaskOverdue ? AlertCircle : CheckCircle,
          tagLabel: language === "sw" ? "Kazi" : "Task",
          title: task.title || t("taskQueued"),
          description: `${t("statusLabel")}: ${formatStatusLabel(task.status || "pending")}`,
          timestamp:
            task.updatedAt || task.createdAt || task.dueDate || new Date().toISOString(),
          ...getToneStyle(tone),
        };
      });

    return [...alertItems, ...notificationItems, ...taskItems]
      .sort(
        (left, right) =>
          new Date(right.timestamp || Date.now()).getTime() -
          new Date(left.timestamp || Date.now()).getTime(),
      )
      .slice(0, 6);
  }, [formatStatusLabel, language, notifications, riskAlerts, t, tasks]);

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
  const avatarFallbackSrc = "/images/default-avatar.svg";
  const profileAvatarSrc = currentUser?.profilePicture || avatarFallbackSrc;
  const userInitials = useMemo(
    () =>
      (currentUser?.fullName || t("userFallback"))
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [currentUser?.fullName, t],
  );

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
        tag: language === "sw" ? "Kesi" : "Caseload",
        metric: `${patients.length}`,
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
        tag: language === "sw" ? "Modeli" : "Model",
        metric:
          selectedPatient || patients[0]
            ? language === "sw"
              ? "Tayari"
              : "Ready"
            : language === "sw"
              ? "Chagua"
              : "Select",
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
        tag: language === "sw" ? "Mwenendo" : "Trends",
        metric: `${dashboardStats.readmissionRate}%`,
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
        tag: language === "sw" ? "Ufuatiliaji" : "Follow-up",
        metric: `${urgentTasks.length}`,
        description:
          language === "sw"
            ? "Kamilisha kazi za uingiliaji na follow-up."
            : "Work through the next intervention and follow-up tasks.",
        colorClass: "bg-gradient-to-br from-amber-500 to-orange-500",
        accentClass: "bg-amber-500",
        onClick: () => setCurrentView("tasks"),
      },
    ],
    [dashboardStats.readmissionRate, language, patients, selectedPatient, urgentTasks.length],
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
                value: `${dashboardStats.averageLos} ${t("daysUnit")}`,
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
                value: `${dashboardStats.averageLos} ${t("daysUnit")}`,
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

              <button
                ref={notificationButtonRef}
                onClick={() => setShowNotifications(!showNotifications)}
                className={`
                  relative p-2 rounded-lg transition-colors
                  ${
                    showNotifications
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200"
                      : "hover:bg-gray-100 dark:hover:bg-slate-800"
                  }
                `}
                aria-label={`${t("notifications")} (${notifications.length + riskAlerts.length})`}
                aria-expanded={showNotifications}
                aria-controls="trip-notification-panel"
              >
                <Bell
                  className={`
                    w-5 h-5
                    ${
                      showNotifications
                        ? "text-teal-700 dark:text-teal-200"
                        : "text-gray-700 dark:text-slate-100"
                    }
                  `}
                />
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {notifications.length + riskAlerts.length}
                </span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l-2 border-gray-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {currentUser?.fullName || t("userFallback")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{roleLabel}</p>
                </div>
                <div className="relative">
                  <img
                    src={profileAvatarSrc}
                    alt={currentUser?.fullName || t("userFallback")}
                    className="w-10 h-10 rounded-full object-cover shadow-lg ring-2 ring-white dark:ring-slate-900"
                    onError={(event) => {
                      event.currentTarget.src = avatarFallbackSrc;
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-teal-500 text-white text-[9px] font-bold px-1.5 py-0.5 shadow">
                    {userInitials}
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
          title={t("navigation")}
          footer={
            (!sidebarCollapsed || isMobileSidebarOpen) && (
              <div className="p-4 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <button
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  <img
                    src={profileAvatarSrc}
                    alt={currentUser?.fullName || t("userFallback")}
                    className="h-10 w-10 rounded-xl object-cover ring-2 ring-teal-500/40"
                    onError={(event) => {
                      event.currentTarget.src = avatarFallbackSrc;
                    }}
                  />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {currentUser?.fullName || t("userFallback")}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {roleLabel}
                    </span>
                  </span>
                </button>
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
          {(!sidebarCollapsed || isMobileSidebarOpen) && (
            <div className="mx-4 mt-4 rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 to-cyan-50 p-3 dark:border-teal-800/70 dark:from-slate-900 dark:to-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
                {t("facility")}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedFacility.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {selectedFacility.region} | {selectedFacility.district}
              </p>
            </div>
          )}
          <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
            {t("menu")}
          </div>
          <nav id="app-sidebar-nav" aria-label="Primary navigation" className="p-4 space-y-1.5">
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
                  title={sidebarCollapsed && !isMobileSidebarOpen ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    w-full flex items-center ${sidebarCollapsed && !isMobileSidebarOpen ? "justify-center" : "gap-3"}
                    px-3 py-2.5 rounded-xl transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-900/25"
                        : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                    }
                  `}
                >
                  <span
                    className={`
                      inline-flex items-center justify-center w-8 h-8 rounded-lg
                      ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
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
                  patientCount={patients.length}
                  urgentTaskCount={urgentTasks.length}
                  onOpenNotifications={() => setShowNotifications((previous) => !previous)}
                  onOpenPatients={() => setCurrentView("patients")}
                  onOpenSettings={handleOpenSettings}
                />
                <Grid
                  cols={1}
                  gap={6}
                  className="lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
                >
                  <QuickActions actions={quickActions} />
                  <RecentActivity activities={recentActivity} />
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
                    canOverridePrediction={userRole === "clinician"}
                    onPredictionOverridden={handlePredictionOverridden}
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
                        const generatedTasks = normalizeTaskCollection(result?.prediction?.tasks || []);
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

                        if (generatedTasks.length > 0) {
                          setTasks((previous) => {
                            const byId = new Map(previous.map((task) => [task.id, task]));
                            generatedTasks.forEach((task) => {
                              byId.set(task.id, task);
                            });
                            return Array.from(byId.values());
                          });
                        }

                        pushNotification({
                          tone: prediction ? "emerald" : "blue",
                          title: t("dischargeWorkflowCompleted"),
                          body: prediction
                            ? translateTemplate("dischargeUpdatedScoreBody", {
                                score: prediction.score ?? "--",
                                tier: prediction.tier || "Unknown",
                              })
                            : t("dischargeSummarySaved"),
                        });
                        trackEvent("Discharge", "Complete", (selectedPatient || patients[0])?.id || "unknown");
                        setCurrentView("dashboard");
                        loadOperationalData();
                      }}
                    />
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-gray-700 dark:text-slate-200 font-semibold">
                        {t("selectPatientFirst")}
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
                          title: t("taskUpdateQueued"),
                          body: translateTemplate("taskUpdateQueuedBody", {
                            title: task.title,
                          }),
                        });
                      }
                    }}
                  />
                )}

                {currentView === "analytics" && <Analytics />}

                {currentView === "data-quality" && (
                  <DataQualityDashboard
                    onBack={() => setCurrentView("dashboard")}
                  />
                )}

                {currentView === "settings" && (
                  <Card className="max-w-5xl mx-auto p-6 sm:p-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
                          {t("settings")}
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
                          {t("profile")} & {t("appearance")}
                        </h3>
                        <p className="mt-2 max-w-2xl text-gray-600 dark:text-slate-300">
                          {t("settingsIntro")}
                        </p>
                      </div>
                      <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-800 sm:flex">
                        <Settings className="h-7 w-7 text-gray-500 dark:text-slate-300" />
                      </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          {t("profile")}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {t("settingsProfileDesc")}
                        </p>

                        <div className="mt-6 flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={profileAvatarSrc}
                              alt={currentUser?.fullName || t("userFallback")}
                              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-teal-500/70"
                              onError={(event) => {
                                event.currentTarget.src = avatarFallbackSrc;
                              }}
                            />
                            <span className="absolute -bottom-1 -right-1 rounded-full bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 shadow">
                              {userInitials}
                            </span>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-950 dark:text-slate-100">
                              {currentUser?.fullName || t("userFallback")}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {t("facility")}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {selectedFacility?.name || t("facilityFallback")}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {selectedFacility?.region || t("nationalView")}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {t("languageLabel")}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {language === "sw" ? t("languageSwahili") : t("languageEnglish")}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {t("settingsLanguageDesc")}
                            </p>
                          </div>
                        </div>
                      </section>

                      <div className="space-y-6">
                        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex flex-col gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {t("appearance")}
                              </p>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                {t("settingsAppearanceDesc")}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/80">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {t("currentTheme")}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {theme === "dark" ? t("themeDark") : t("themeLight")}
                            </p>
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            {t("languageLabel")}
                          </p>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {t("settingsLanguageDesc")}
                          </p>
                          <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/80">
                            <Globe className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                            <select
                              id="settings-language"
                              value={language}
                              onChange={(event) => setLanguage(event.target.value)}
                              className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100"
                            >
                              <option value="sw">{t("languageSwahili")}</option>
                              <option value="en">{t("languageEnglish")}</option>
                            </select>
                          </div>
                        </section>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="mt-8 ml-auto flex"
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
        <>
          <button
            type="button"
            aria-label="Close notifications panel"
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-50"
            onClick={() => setShowNotifications(false)}
          />
          <div
            id="trip-notification-panel"
            ref={notificationPanelRef}
            className="fixed top-16 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-950 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-slate-800 z-[60] overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-between gap-3">
              <h3 className="font-bold text-white">{t("notifications")}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadRiskAlerts}
                  className="inline-flex items-center gap-1 rounded-md bg-white/20 hover:bg-white/30 px-2 py-1 text-xs text-white"
                  type="button"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAlertsLoading ? "animate-spin" : ""}`} />
                  {t("refresh")}
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex items-center rounded-md bg-white/20 hover:bg-white/30 px-2 py-1 text-xs text-white"
                  type="button"
                >
                  {t("close")}
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    {t("activeRiskAlerts")}
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
                      {t("noOpenHighRiskAlerts")}
                    </p>
                  </div>
                )}

                {!isAlertsLoading && !alertsError && riskAlerts.length > 0 && (
                  <div className="space-y-2">
                    {riskAlerts.map((alert) => (
                      <div key={alert.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-red-900">
                            {t("patientLabel")} {alert.patientId}
                          </p>
                          <Badge variant="danger" size="sm">
                            {resolveRiskTier(alert.tier || "High")}
                          </Badge>
                        </div>
                        <p className="text-xs text-red-700 mt-1">
                          {t("scoreLabel")} {alert.score} ({t("thresholdLabel").toLowerCase()} {alert.threshold})
                        </p>
                        <p className="text-[11px] text-red-700 mt-1">
                          {t("statusLabel")}: {formatStatusLabel(alert.status || "open")}
                        </p>
                        <p className="text-[11px] text-red-600 mt-1">
                          {new Date(alert.createdAt).toLocaleString(language === "sw" ? "sw-TZ" : "en-US")}
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
                            {t("acknowledge")}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="!py-1 !px-2 text-xs"
                            onClick={() => handleResolveAlert(alert.id)}
                            loading={alertActionId === `resolve:${alert.id}`}
                            disabled={Boolean(alertActionId)}
                          >
                            {t("resolve")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                  {t("activityNotifications")}
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
                      <p className="text-sm text-gray-700">{t("noNotificationsYet")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
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

