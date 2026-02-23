import React, { useState } from "react";
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
import PatientDetail from "./components/patient/PatientDetail";
import PatientsList from "./components/patient/PatientsList";
import DischargeWorkflow from "./components/discharge/DischargeWorkflow";
import Analytics from "./components/analytics/Analytics";
import Tasks from "./components/dashboard/Tasks";

// Data
import { SAMPLE_PATIENTS } from "./data/patients";
import { SAMPLE_FACILITIES } from "./data/facilities";
import { useI18n } from "./context/I18nProvider";

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

const App = () => {
  const [currentPage, setCurrentPage] = useState("landing");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedFacility] = useState(SAMPLE_FACILITIES[0]);
  const { language, setLanguage, t } = useI18n();

  const handleLogin = (role) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentPage("landing");
    setCurrentView("dashboard");
    setSelectedPatient(null);
  };

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

    return `${tier} ${t("riskSuffix")}`;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {t("welcome")}, Dr. Samwel Mhagama
          </h1>
          <p className="text-gray-600">
            {selectedFacility.name} · {selectedFacility.region}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-teal-500 outline-none">
            <option value="7d">{t("last7Days")}</option>
            <option value="30d">{t("last30Days")}</option>
            <option value="90d">{t("last90Days")}</option>
            <option value="custom">{t("customRange")}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t("readmissionRate")}
          value="8.4%"
          change={t("kpiReadmissionDelta")}
          trend="up"
          icon={TrendingUp}
          color="teal"
        />
        <KPICard
          title={t("highRiskDischarges")}
          value="23"
          change={t("kpiHighRiskDelta")}
          trend="down"
          icon={Activity}
          color="red"
        />
        <KPICard
          title={t("avgLengthOfStay")}
          value="4.8 days"
          change={t("kpiAvgStayDelta")}
          trend="up"
          icon={CheckCircle}
          color="purple"
        />
        <KPICard
          title={t("interventionRate")}
          value="92%"
          change={t("kpiInterventionDelta")}
          trend="up"
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {t("todayDischarges")}
            </h2>
            <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
              {t("filter")}
            </Button>
          </div>

          <div className="space-y-4">
            {SAMPLE_PATIENTS.slice(0, 4).map((patient) => (
              <div
                key={patient.id}
                className="p-4 border-2 border-gray-100 rounded-lg hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedPatient(patient);
                  setCurrentView("patient-detail");
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">
                        {patient.name}
                      </h3>
                      <Badge variant="default">{patient.id}</Badge>
                      <Badge variant={patient.riskTier.toLowerCase()}>
                        {resolveRiskTier(patient.riskTier)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {patient.age}
                      {t("ageShort")} · {patient.gender} · {patient.ward}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      {patient.diagnosis.primary}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      {patient.interventionsNeeded
                        ?.slice(0, 3)
                        .map((intervention, idx) => (
                          <Badge
                            key={idx}
                            variant={
                              intervention.priority === "high"
                                ? "danger"
                                : "warning"
                            }
                            size="sm"
                          >
                            {intervention.type.replace(/-/g, " ")}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <RiskScoreDisplay
                      score={patient.riskScore}
                      tier={patient.riskTier}
                      size="sm"
                    />
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
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
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    {t("highRiskNoDischargePlan")}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Amina Mwambungu (PT-2025-0847)
                  </p>
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    {t("dueHoursAgo")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    {t("taskMedicationReconciliation")}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Grace Massawe (PT-2025-0856)
                  </p>
                  <p className="text-xs text-amber-600 mt-2 font-medium">
                    {t("dueTodayAt")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    {t("taskFollowup7Day")}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t("patientsPending")}
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    {t("scheduledTomorrow")}
                  </p>
                </div>
              </div>
            </div>
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
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {t("riskDistribution")}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <p className="text-4xl font-bold text-emerald-700 mb-2">156</p>
            <p className="text-sm font-semibold text-emerald-600">
              {t("lowRisk")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("dischargeShareLow")}
            </p>
          </div>
          <div className="text-center p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
            <p className="text-4xl font-bold text-amber-700 mb-2">45</p>
            <p className="text-sm font-semibold text-amber-600">
              {t("mediumRisk")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("dischargeShareMedium")}
            </p>
          </div>
          <div className="text-center p-6 bg-red-50 rounded-xl border-2 border-red-200">
            <p className="text-4xl font-bold text-red-700 mb-2">16</p>
            <p className="text-sm font-semibold text-red-600">
              {t("highRisk")}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {t("dischargeShareHigh")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30">
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="lg:hidden"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">TRIP</h1>
                  <p className="text-xs text-gray-500">{t("appTagline")}</p>
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

            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <label htmlFor="app-language" className="sr-only">
                  {t("languageLabel")}
                </label>
                <select
                  id="app-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="sw">{t("languageSwahili")}</option>
                  <option value="en">{t("languageEnglish")}</option>
                </select>
              </div>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="flex items-center gap-3 pl-3 border-l-2 border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">
                    Dr. Samwel Mhagama
                  </p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">SM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <div
          className={`
          ${sidebarCollapsed ? "w-20" : "w-64"}
          bg-white border-r-2 border-gray-200 min-h-screen transition-all duration-300
          fixed lg:sticky top-[73px] z-40
          ${sidebarCollapsed && "lg:block hidden"}
        `}
        >
          <nav className="p-4 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSelectedPatient(null);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg"
                        : "hover:bg-gray-100 text-gray-700"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {!sidebarCollapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {!sidebarCollapsed && (
            <div className="p-4 mt-4 border-t-2 border-gray-200">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-all">
                <Settings className="w-5 h-5" />
                <span className="font-medium text-sm">{t("settings")}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-all mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">{t("logout")}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 lg:p-8">
          {currentView === "dashboard" && <Dashboard />}

          {currentView === "patients" && (
            <PatientsList
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

          {currentView === "discharge" && (
            <DischargeWorkflow
              patient={selectedPatient || SAMPLE_PATIENTS[0]}
              onBack={() =>
                setCurrentView(selectedPatient ? "patient-detail" : "patients")
              }
              onComplete={() => {
                alert(t("dischargeWorkflowCompleted"));
                setCurrentView("dashboard");
              }}
            />
          )}

          {currentView === "tasks" && (
            <Tasks
              onPatientSelect={(patient) => {
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
        </div>
      </div>

      {showNotifications && (
        <div className="fixed top-20 right-6 w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700">
            <h3 className="font-bold text-white">{t("notifications")}</h3>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-semibold text-red-900">
                {t("notificationHighRiskPatient")}
              </p>
              <p className="text-xs text-red-700 mt-1">
                {t("notificationHighRiskPatientBody")}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">
                {t("notificationFollowupDue")}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {t("notificationFollowupDueBody")}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">
                {t("notificationDataQualityImproved")}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {t("notificationDataQualityImprovedBody")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-t-2 border-gray-200 px-6 py-4 text-center">
        <p className="text-xs text-gray-500">
          {t("footerPlatform")} ·
          <span className="text-teal-600 font-semibold ml-1">
            {t("footerSecureTagline")}
          </span>
        </p>
      </div>
    </div>
  );
};

export default App;
