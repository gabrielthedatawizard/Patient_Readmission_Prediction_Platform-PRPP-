import React, { Suspense, lazy, useState, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Activity, Menu, Globe, Bell, ChevronRight, Settings, LogOut } from "lucide-react";

// Context Hooks
import { useAuth } from "./context/AuthProvider";
import { usePatient } from "./context/PatientProvider";
import { useTask } from "./context/TaskProvider";
import { useAlert } from "./context/AlertProvider";
import { useI18n } from "./context/I18nProvider";
import { useTheme } from "./context/ThemeContext";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// Components
import Sidebar from "./components/layout/Sidebar";
import DashboardHeader from "./components/dashboard/DashboardHeader";
import QuickActions from "./components/dashboard/QuickActions";
import RecentActivity from "./components/dashboard/RecentActivity";
import PatientsList from "./components/patient/PatientsList";
import Tasks from "./components/dashboard/Tasks";
import PageTransition from "./components/PageTransition";
import Grid from "./design-system/layout/Grid";
import { PatientCardSkeleton } from "./design-system/components/Skeleton";
import Card from "./components/common/Card";
import Button from "./components/common/Button";

// Data
import { SAMPLE_FACILITIES } from "./data/facilities";

// Lazy Loaded Dashboards & Views
const Analytics = lazy(() => import("./components/analytics/Analytics"));
const DataQualityDashboard = lazy(() => import("./components/analytics/DataQualityDashboard"));
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

const DEFAULT_FACILITY = SAMPLE_FACILITIES[0] || {
  name: "TRIP Facility",
  region: "Unknown",
  district: "Unknown",
};

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
  const navigate = useNavigate();

  switch (userRole) {
    case "moh":
      return <MoHNationalDashboard />;
    case "rhmt":
      return <RHMTDashboard region={currentUser?.regionCode || DEFAULT_FACILITY.region} />;
    case "chmt":
      return <CHMTDashboard district={DEFAULT_FACILITY.district} />;
    case "facility-manager":
      return <FacilityManagerDashboard facilityId={currentUser?.facilityId} />;
    case "clinician":
      return (
        <ClinicianDashboard
          clinicianId={currentUser?.id}
          onOpenPatient={(patient) => {
            if (patient) {
              navigate(`/patients/${patient.id}`);
            }
          }}
          onStartDischarge={(patient) => {
            if (patient) {
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
  const { language, setLanguage, t } = useI18n();
  const { patients } = usePatient();
  const { tasks, urgentTasks } = useTask();
  const { riskAlerts, notifications, showNotifications, setShowNotifications } = useAlert();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userInitials = currentUser?.fullName
    ? currentUser.fullName.split(" ").map(n => n[0]).join("")
    : "U";

  const totalNotifications = notifications.length + riskAlerts.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 overflow-x-hidden dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm dark:bg-slate-950/90 dark:border-slate-800 backdrop-blur-xl">
        <div className="px-3 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsMobileSidebarOpen((open) => !open)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-slate-100" />
              </button>
              <button
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                className="hidden lg:inline-flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-slate-100" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 leading-none">TRIP</h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

              <div className="flex items-center gap-3 pl-3 border-l-2 border-gray-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold dark:text-slate-100">{currentUser?.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{userRole}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-teal-100 border text-teal-800 flex items-center justify-center font-bold">
                  {userInitials}
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
                  onClick={() => navigate("/settings")}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-all"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium text-sm">{t("settings")}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-all mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm">{t("logout")}</span>
                </button>
              </div>
            )
          }
        >
          <nav className="p-4 space-y-1.5">
            {[
              { id: "/dashboard", label: "Dashboard", icon: Activity },
              { id: "/patients", label: "Patients", icon: Activity },
              { id: "/tasks", label: "Tasks", icon: Activity },
              { id: "/analytics", label: "Analytics", icon: Activity },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.id);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center ${sidebarCollapsed && !isMobileSidebarOpen ? "justify-center" : "gap-3"}
                    px-3 py-2.5 rounded-xl transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {(!sidebarCollapsed || isMobileSidebarOpen) && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </Sidebar>

        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <Suspense fallback={<PatientCardSkeleton />}>
              <PageTransition viewKey={location.pathname}>
                {children}
              </PageTransition>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

const PatientDetailWrapper = () => {
  const { patients, selectedPatient, setSelectedPatient } = usePatient();
  const navigate = useNavigate();

  // Very simplified route handler for PatientDetail
  return selectedPatient ? (
    <PatientDetail
      patient={selectedPatient}
      onBack={() => navigate("/patients")}
      onStartDischarge={() => navigate(`/discharge/${selectedPatient.id}`)}
      canOverridePrediction={true}
    />
  ) : (
    <Card className="p-8 text-center"><p>Select a patient</p></Card>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<RoleDashboard />} />
                <Route path="/patients" element={<PatientsList patients={[]} onPatientSelect={() => {}} />} />
                <Route path="/patients/:id" element={<PatientDetailWrapper />} />
                <Route path="/tasks" element={<Tasks tasks={[]} patients={[]} />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Card className="p-8"><p>Settings Page</p></Card>} />
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
