import React, { Suspense, lazy, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Activity,
  ArrowUpCircle,
  BarChart3,
  Bell,
  ChevronRight,
  Globe,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

// Context Hooks
import { useAuth } from "./context/AuthProvider";
import { useWorkspace } from "./context/WorkspaceProvider";
import { usePatient } from "./context/PatientProvider";
import { useTask } from "./context/TaskProvider";
import { useAlert } from "./context/AlertProvider";
import { useI18n } from "./context/I18nProvider";
import { useConnectivityStatus } from "./hooks/useConnectivityStatus";
import { getAvatarStyle, getUserInitials, getUserRoleLabel } from "./services/userIdentity";
import {
  canAccessWorkspaceFeature,
  canNavigateFromTaskToPatient,
  canOverridePrediction,
  canReceiveOperationalNotifications,
  canStartDischarge,
  getAllowedWorkspaceNavIds,
} from "./services/roleAccess";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

// Components
import Sidebar from "./components/layout/Sidebar";
import PageTransition from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import { PatientCardSkeleton } from "./design-system/components/Skeleton";
import Card from "./components/common/Card";
import WorkspaceScopeBar from "./components/workspace/WorkspaceScopeBar";
import useKeyboardShortcut from "./hooks/useKeyboardShortcut";

// Lazy Loaded Dashboards & Views
const Analytics = lazy(() => import("./components/analytics/Analytics"));
const DischargeWorkflow = lazy(() => import("./components/discharge/DischargeWorkflow"));
const PatientDetail = lazy(() => import("./components/patient/PatientDetail"));
const PatientsList = lazy(() => import("./components/patient/PatientsList"));
const Tasks = lazy(() => import("./components/dashboard/Tasks"));
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

const resolveRoutePatient = (patientId, patients, selectedPatient) =>
  patients.find((patient) => patient.id === patientId) ||
  (selectedPatient?.id === patientId ? selectedPatient : null);

const SIDEBAR_PREFERENCE_KEY = "trip_sidebar_collapsed_v2";

function readSidebarPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "collapsed";
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center">
          <Activity className="w-8 h-8 text-teal-600 animate-pulse mb-4" />
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Loading TRIP...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const RoleDashboard = () => {
  const { userRole, currentUser } = useAuth();
  const { currentScope } = useWorkspace();
  const { setSelectedPatient } = usePatient();
  const navigate = useNavigate();

  switch (userRole) {
    case "moh":
      return <MoHNationalDashboard />;
    case "rhmt":
      return <RHMTDashboard region={currentScope.regionName || currentScope.regionCode || currentUser?.regionCode || ""} />;
    case "chmt":
      return <CHMTDashboard district={currentScope.district || ""} />;
    case "facility-manager":
      return <FacilityManagerDashboard facilityId={currentUser?.facilityId} />;
    case "clinician":
      return (
        <ClinicianDashboard
          clinicianId={currentUser?.id}
          onOpenPatient={(patient) => {
            if (patient) {
              setSelectedPatient(patient);
              navigate(`/patients/${patient.id}`);
            }
          }}
          onStartDischarge={(patient) => {
            if (patient) {
              setSelectedPatient(patient);
              navigate(`/discharge/${patient.id}`);
            }
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
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl shadow">
          <h2 className="text-xl font-bold">Standard Dashboard</h2>
          <p className="text-gray-500 mt-2">Welcome to TRIP Platform</p>
        </div>
      );
  }
};

const Layout = ({ children }) => {
  const { currentUser, userRole, handleLogout } = useAuth();
  const {
    language,
    setLanguage,
    t,
  } = useI18n();
  const { isUsingOfflineData } = usePatient();
  const { pendingSyncCount, isUsingOfflineTasks } = useTask();
  const { riskAlerts, notifications, showNotifications, setShowNotifications } = useAlert();
  const { scopeLabel, canBrowseHierarchy, canSwitchOperationalMode } = useWorkspace();
  const isOnline = useConnectivityStatus();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarPreference);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userInitials = getUserInitials(currentUser?.fullName, t("userFallback"));
  const avatarStyle = getAvatarStyle(userRole);
  const roleLabel = getUserRoleLabel(userRole, t);
  const usingOfflineSnapshot = isUsingOfflineData || isUsingOfflineTasks;
  const statusCopy = language === "sw"
    ? {
        online: "Mtandaoni",
        offline: "Offline",
        queued: "Foleni ya sync",
        cached: "Inatumia cache",
      }
    : {
        online: "Online",
        offline: "Offline",
        queued: "Sync queue",
        cached: "Using cache",
      };

  const totalNotifications = notifications.length + riskAlerts.length;
  const navToggleCopy =
    language === "sw"
      ? {
          open: "Panua menyu",
          close: "Finya menyu",
          shortcut: "Ctrl+B",
          mobile: "Fungua menyu",
          rail: "Urambazaji",
          quickSettings: "Mipangilio",
          quickLogout: "Ondoka",
        }
      : {
          open: "Expand menu",
          close: "Collapse menu",
          shortcut: "Ctrl+B",
          mobile: "Open menu",
          rail: "Navigation",
          quickSettings: "Settings",
          quickLogout: "Logout",
        };
  const navItems = [
    { id: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { id: "/patients", label: t("patients"), icon: Users },
    { id: "/tasks", label: t("tasks"), icon: ListChecks },
    { id: "/analytics", label: t("analytics"), icon: BarChart3 },
    { id: "/settings", label: t("settings"), icon: Settings2 },
  ].filter((item) => getAllowedWorkspaceNavIds(userRole).includes(item.id));
  const canViewNotifications = canReceiveOperationalNotifications(userRole);
  const toggleDesktopSidebar = React.useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  useKeyboardShortcut("b", toggleDesktopSidebar);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_PREFERENCE_KEY,
      sidebarCollapsed ? "collapsed" : "expanded",
    );
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 overflow-x-hidden dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm dark:bg-slate-950/90 dark:border-slate-800 backdrop-blur-xl">
        <div className="px-3 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsMobileSidebarOpen((open) => !open)}
                aria-label={navToggleCopy.mobile}
                aria-expanded={isMobileSidebarOpen}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-slate-100" />
              </button>
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                aria-label={sidebarCollapsed ? navToggleCopy.open : navToggleCopy.close}
                title={`${sidebarCollapsed ? navToggleCopy.open : navToggleCopy.close} (${navToggleCopy.shortcut})`}
                className="hidden lg:inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
                <span>{sidebarCollapsed ? navToggleCopy.open : navToggleCopy.close}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {navToggleCopy.shortcut}
                </span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 leading-none">TRIP</h1>
                  <p className="mt-1 hidden text-xs font-medium text-slate-500 lg:block">
                    {scopeLabel.title || t("facilityFallback")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden xl:flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  isOnline
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-amber-100 bg-amber-50 text-amber-700"
                }`}>
                  {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {isOnline ? statusCopy.online : statusCopy.offline}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  pendingSyncCount > 0
                    ? "border-sky-100 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}>
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  {statusCopy.queued}: {pendingSyncCount}
                </span>
                {usingOfflineSnapshot ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    <ChevronRight className="h-3.5 w-3.5" />
                    {statusCopy.cached}
                  </span>
                ) : null}
              </div>

              <div className="px-2 py-1.5 bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent outline-none text-sm dark:text-white"
                >
                  <option value="sw">SW</option>
                  <option value="en">EN</option>
                </select>
              </div>

              {canViewNotifications ? (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-slate-100" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {totalNotifications}
                    </span>
                  )}
                </button>
              ) : null}

              <div className="flex items-center gap-3 pl-3 border-l-2 border-gray-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold dark:text-slate-100">{currentUser?.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{roleLabel}</p>
                </div>
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.fullName}
                    className="h-10 w-10 rounded-2xl object-cover ring-2 ring-teal-500/30"
                  />
                ) : (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarStyle.gradient} text-sm font-bold text-white shadow-md`}>
                    {userInitials}
                  </div>
                )}
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
          header={
            <div className="hidden lg:block px-3 pt-3">
              <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900`}>
                {!sidebarCollapsed ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {navToggleCopy.rail}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {scopeLabel.badge || t("nationalView")}
                    </p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={toggleDesktopSidebar}
                  aria-label={sidebarCollapsed ? navToggleCopy.open : navToggleCopy.close}
                  title={`${sidebarCollapsed ? navToggleCopy.open : navToggleCopy.close} (${navToggleCopy.shortcut})`}
                  className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950 ${sidebarCollapsed ? "" : "shrink-0"}`}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                  <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block group-focus-visible:block dark:bg-slate-100 dark:text-slate-950">
                    {sidebarCollapsed ? navToggleCopy.open : navToggleCopy.close}
                  </span>
                </button>
              </div>
            </div>
          }
          footer={
            (!sidebarCollapsed || isMobileSidebarOpen) ? (
              <div className="p-4 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {scopeLabel.badge || t("nationalView")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {scopeLabel.title || t("facilityFallback")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {isOnline ? statusCopy.online : statusCopy.offline}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                      {statusCopy.queued}: {pendingSyncCount}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-all mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm">{t("logout")}</span>
                </button>
              </div>
            ) : (
              <div className="mt-3 border-t border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    aria-label={navToggleCopy.quickSettings}
                    title={navToggleCopy.quickSettings}
                    className="group relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block group-focus-visible:block dark:bg-slate-100 dark:text-slate-950">
                      {navToggleCopy.quickSettings}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label={navToggleCopy.quickLogout}
                    title={navToggleCopy.quickLogout}
                    className="group relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition-all hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950 dark:focus-visible:ring-offset-slate-950"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block group-focus-visible:block dark:bg-slate-100 dark:text-slate-950">
                      {navToggleCopy.quickLogout}
                    </span>
                  </button>
                </div>
              </div>
            )
          }
        >
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  title={sidebarCollapsed && !isMobileSidebarOpen ? item.label : undefined}
                  className={`
                    group relative w-full flex items-center ${sidebarCollapsed && !isMobileSidebarOpen ? "justify-center" : "gap-3"}
                    px-3 py-2.5 rounded-xl transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                    }
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {(!sidebarCollapsed || isMobileSidebarOpen) && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                  {sidebarCollapsed && !isMobileSidebarOpen ? (
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block group-focus-visible:block dark:bg-slate-100 dark:text-slate-950">
                      {item.label}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </Sidebar>

        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Suspense fallback={<PatientCardSkeleton />}>
              <PageTransition viewKey={location.pathname}>
                {(canBrowseHierarchy || canSwitchOperationalMode) ? <WorkspaceScopeBar /> : null}
                {children}
              </PageTransition>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

const LandingRoute = () => {
  const navigate = useNavigate();

  return <LandingPage onLogin={() => navigate("/login")} />;
};

const PatientsRoute = () => {
  const { userRole } = useAuth();
  const { patients, isDataLoading, dataError, setSelectedPatient } = usePatient();
  const navigate = useNavigate();

  if (!canAccessWorkspaceFeature(userRole, "patientDirectory")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isDataLoading && !patients.length) {
    return <PatientCardSkeleton />;
  }

  if (dataError && !patients.length) {
    return <Card className="p-8"><p>{dataError}</p></Card>;
  }

  return (
    <PatientsList
      patients={patients}
      onPatientSelect={
        canAccessWorkspaceFeature(userRole, "patientDetail")
          ? (patient) => {
              setSelectedPatient(patient);
              navigate(`/patients/${patient.id}`);
            }
          : undefined
      }
    />
  );
};

const TasksRoute = () => {
  const { userRole } = useAuth();
  const { patients, setSelectedPatient } = usePatient();
  const { tasks, handleTaskUpdate, isTasksLoading, taskError } = useTask();
  const navigate = useNavigate();

  if (!canAccessWorkspaceFeature(userRole, "taskWorkspace")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isTasksLoading && !tasks.length) {
    return <PatientCardSkeleton />;
  }

  if (taskError && !tasks.length) {
    return <Card className="p-8"><p>{taskError}</p></Card>;
  }

  return (
    <Tasks
      tasks={tasks}
      patients={patients}
      onTaskUpdate={handleTaskUpdate}
      onPatientSelect={
        canNavigateFromTaskToPatient(userRole)
          ? (patient) => {
              if (!patient) {
                return;
              }

              setSelectedPatient(patient);
              navigate(`/patients/${patient.id}`);
            }
          : undefined
      }
    />
  );
};

const PatientDetailWrapper = () => {
  const { userRole } = useAuth();
  const { id = "" } = useParams();
  const {
    patients,
    selectedPatient,
    setSelectedPatient,
    isDataLoading,
    dataError,
    updatePatientPrediction,
  } = usePatient();
  const navigate = useNavigate();

  const routePatient = resolveRoutePatient(id, patients, selectedPatient);

  useEffect(() => {
    if (!canAccessWorkspaceFeature(userRole, "patientDetail")) {
      return;
    }

    if (routePatient?.id && routePatient.id !== selectedPatient?.id) {
      setSelectedPatient(routePatient);
    }
  }, [routePatient, selectedPatient?.id, setSelectedPatient, userRole]);

  if (!canAccessWorkspaceFeature(userRole, "patientDetail")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isDataLoading && !routePatient) {
    return <PatientCardSkeleton />;
  }

  if (dataError && !routePatient) {
    return <Card className="p-8"><p>{dataError}</p></Card>;
  }

  return routePatient ? (
    <PatientDetail
      patient={routePatient}
      onBack={() => navigate("/patients")}
      onStartDischarge={
        canStartDischarge(userRole)
          ? () => navigate(`/discharge/${routePatient.id}`)
          : undefined
      }
      canOverridePrediction={canOverridePrediction(userRole)}
      onPredictionOverridden={(prediction) =>
        updatePatientPrediction(routePatient.id, prediction)
      }
    />
  ) : (
    <Card className="p-8 text-center"><p>Patient not found.</p></Card>
  );
};

const DischargeRoute = () => {
  const { userRole } = useAuth();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const {
    patients,
    selectedPatient,
    setSelectedPatient,
    isDataLoading,
    dataError,
    updatePatientPrediction,
  } = usePatient();
  const navigate = useNavigate();
  const routePatient = resolveRoutePatient(id, patients, selectedPatient);

  useEffect(() => {
    if (!canAccessWorkspaceFeature(userRole, "dischargeWorkflow")) {
      return;
    }

    if (routePatient?.id && routePatient.id !== selectedPatient?.id) {
      setSelectedPatient(routePatient);
    }
  }, [routePatient, selectedPatient?.id, setSelectedPatient, userRole]);

  if (!canAccessWorkspaceFeature(userRole, "dischargeWorkflow")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isDataLoading && !routePatient) {
    return <PatientCardSkeleton />;
  }

  if (dataError && !routePatient) {
    return <Card className="p-8"><p>{dataError}</p></Card>;
  }

  return routePatient ? (
    <DischargeWorkflow
      patient={routePatient}
      onBack={() => navigate(`/patients/${routePatient.id}`)}
      onComplete={async ({ prediction } = {}) => {
        if (prediction) {
          updatePatientPrediction(routePatient.id, prediction);
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["trip", "patients"] }),
          queryClient.invalidateQueries({ queryKey: ["trip", "tasks"] }),
          queryClient.invalidateQueries({ queryKey: ["trip", "predictions"] }),
          queryClient.invalidateQueries({ queryKey: ["trip", "dashboard"] }),
        ]);

        navigate(`/patients/${routePatient.id}`);
      }}
    />
  ) : (
    <Card className="p-8 text-center"><p>Patient not found.</p></Card>
  );
};

const AnalyticsRoute = () => {
  const { userRole } = useAuth();

  if (!canAccessWorkspaceFeature(userRole, "analyticsWorkspace")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Analytics />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<RoleDashboard />} />
                <Route path="/patients" element={<PatientsRoute />} />
                <Route path="/patients/:id" element={<PatientDetailWrapper />} />
                <Route path="/discharge/:id" element={<DischargeRoute />} />
                <Route path="/tasks" element={<TasksRoute />} />
                <Route path="/analytics" element={<AnalyticsRoute />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
