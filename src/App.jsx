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
import PatientsList from "./components/patient/PatientsList";
import Tasks from "./components/dashboard/Tasks";
import Sidebar from "./components/layout/Sidebar";
import Grid from "./design-system/layout/Grid";
import { PatientCardSkeleton, Skeleton } from "./design-system/components/Skeleton";
import useKeyboardShortcut from "./hooks/useKeyboardShortcut";

// Data
import { SAMPLE_FACILITIES } from "./data/facilities";
import { useI18n } from "./context/I18nProvider";
import {
  clearSession,
  fetchCurrentUser,
  fetchLatestPrediction,
  fetchPatients,
  fetchTasks,
  getStoredToken,
  logout as logoutRequest,
} from "./services/apiClient";
import wsClient from "./services/websocket";
import {
  mapApiPatientsToUiPatients,
  mapApiTasksToUiTasks,
} from "./services/uiMappers";
import { trackEvent, trackPageView } from "./services/analytics";

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
  const [selectedFacility, setSelectedFacility] = useState(DEFAULT_FACILITY);
  const [patients, setPatients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const { language, setLanguage, t } = useI18n();

  const pushNotification = useCallback((notification) => {
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tone: notification.tone || "blue",
      title: notification.title || "",
      body: notification.body || "",
      titleKey: notification.titleKey,
      bodyKey: notification.bodyKey,
    };

    setNotifications((previous) => [record, ...previous].slice(0, 25));
  }, []);

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

      setPatients(mappedPatients);
      setTasks(mappedTasks);
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
    } catch (error) {
      setDataError(error?.message || "Unable to load operational data.");
      setPatients([]);
      setTasks([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [currentUser]);

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

    const token = getStoredToken();
    if (!token) {
      return undefined;
    }

    wsClient.connect({ userId: currentUser.id, token });

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

    const unsubscribeTask = wsClient.subscribe("TASK_ASSIGNED", (task) => {
      if (!task?.id) {
        return;
      }
      setTasks((previous) => [task, ...previous.filter((entry) => entry.id !== task.id)]);
      pushNotification({
        tone: "blue",
        title: "Task assigned",
        body: task.title || "A new task was assigned.",
      });
    });

    return () => {
      unsubscribePrediction?.();
      unsubscribeTask?.();
      wsClient.disconnect();
    };
  }, [isAuthenticated, currentUser?.id, pushNotification]);

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

  const urgentTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== "completed")
      .sort((first, second) => first.dueDate - second.dueDate)
      .slice(0, 3);
  }, [tasks]);

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
    },
  ];

  const filteredNavItems = navigationItems.filter(
    (item) => item.roles.includes("all") || item.roles.includes(userRole),
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
    await logoutRequest();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    setCurrentPage("landing");
    setCurrentView("dashboard");
    setSelectedPatient(null);
    setPatients([]);
    setTasks([]);
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {t("welcome")}, {currentUser?.fullName || "TRIP User"}
          </h1>
          <p className="text-gray-600">
            {selectedFacility.name} | {selectedFacility.region}
          </p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3">
          <select className="w-full sm:w-auto px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-teal-500 outline-none">
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

      <Grid cols={4} gap={6}>
        <KPICard
          title={t("readmissionRate")}
          value={`${dashboardStats.readmissionRate}%`}
          change={t("kpiReadmissionDelta")}
          trend="up"
          icon={TrendingUp}
          color="teal"
        />
        <KPICard
          title={t("highRiskDischarges")}
          value={String(dashboardStats.highRiskCount)}
          change={t("kpiHighRiskDelta")}
          trend="down"
          icon={Activity}
          color="red"
        />
        <KPICard
          title={t("avgLengthOfStay")}
          value={`${dashboardStats.averageLos} days`}
          change={t("kpiAvgStayDelta")}
          trend="up"
          icon={CheckCircle}
          color="purple"
        />
        <KPICard
          title={t("interventionRate")}
          value={`${dashboardStats.interventionRate}%`}
          change={t("kpiInterventionDelta")}
          trend="up"
          icon={CheckCircle}
          color="emerald"
        />
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
            <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 overflow-x-hidden">
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-3 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsMobileSidebarOpen((open) => !open)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileSidebarOpen}
                aria-controls="app-sidebar-nav"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                className="hidden lg:inline-flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Collapse sidebar"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">TRIP</h1>
                  <p className="hidden md:block text-xs text-gray-500">{t("appTagline")}</p>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-gray-600">{t("national")}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{selectedFacility.region}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{selectedFacility.district}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-900">
                {selectedFacility.name}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700 transition-colors flex items-center gap-1.5 sm:gap-2">
                <Globe className="w-4 h-4" />
                <label htmlFor="app-language" className="sr-only">
                  {t("languageLabel")}
                </label>
                <select
                  id="app-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent outline-none text-xs sm:text-sm"
                >
                  <option value="sw">{t("languageSwahili")}</option>
                  <option value="en">{t("languageEnglish")}</option>
                </select>
              </div>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={`Open notifications (${notifications.length})`}
              >
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              </button>

              <div className="hidden sm:flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l-2 border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {currentUser?.fullName || "TRIP User"}
                  </p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
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
              <div className="p-4 mt-4 border-t-2 border-gray-200">
                <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 text-gray-700 transition-all">
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
          <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
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
                        : "hover:bg-gray-100 text-gray-700"
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
          <Suspense fallback={<PatientCardSkeleton />}>
            {currentView === "dashboard" && <Dashboard />}

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
                  <p className="text-gray-700 font-semibold">
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
              />
            )}

            {currentView === "analytics" && <Analytics />}

            {currentView === "data-quality" && (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Database className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("dataQualityDashboard")}
                </h3>
                <p className="text-gray-600">{t("dataQualityInProgress")}</p>
                <Button
                  variant="primary"
                  onClick={() => setCurrentView("dashboard")}
                  className="mt-6"
                >
                  {t("backToDashboard")}
                </Button>
              </div>
            )}
          </Suspense>
        </div>
      </div>

      {showNotifications && (
        <div className="fixed top-16 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700">
            <h3 className="font-bold text-white">{t("notifications")}</h3>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
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

