import React, { useState } from 'react';
import { 
  Activity, Users, FileText, CheckCircle, TrendingUp, 
  Settings, LogOut, Menu, Bell, Globe, ChevronRight,
  BarChart3, Database, Search, Filter
} from 'lucide-react';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Components
import Card from './components/common/Card';
import Badge from './components/common/Badge';
import Button from './components/common/Button';
import KPICard from './components/common/KPICard';
import RiskScoreDisplay from './components/common/RiskScoreDisplay';
import PatientDetail from './components/patient/PatientDetail';
import PatientsList from './components/patient/PatientsList';
import DischargeWorkflow from './components/discharge/DischargeWorkflow';
import Analytics from './components/analytics/Analytics';
import Tasks from './components/dashboard/Tasks';

// Data
import { SAMPLE_PATIENTS } from './data/patients';
import { SAMPLE_FACILITIES } from './data/facilities';

/**
 * TRIP Platform - Main Application
 * Tanzania Readmission Intelligence Platform
 */

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(SAMPLE_FACILITIES[0]);

  const handleLogin = (role) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentPage('landing');
    setCurrentView('dashboard');
    setSelectedPatient(null);
  };

  // Translations
  const translations = {
    en: {
      dashboard: 'Dashboard',
      patients: 'Patients',
      analytics: 'Analytics',
      discharge: 'Discharge',
      tasks: 'Tasks',
      settings: 'Settings',
      logout: 'Logout',
      welcome: 'Welcome',
      readmissionRate: '30-Day Readmission Rate',
      highRisk: 'High-Risk Discharges',
      avgStay: 'Avg Length of Stay',
      intervention: 'Intervention Rate',
      todayDischarges: "Today's Discharges",
      actionQueue: 'Action Queue',
      riskDistribution: 'Risk Distribution',
      search: 'Search patients...',
      viewDetails: 'View Details'
    },
    sw: {
      dashboard: 'Dashibodi',
      patients: 'Wagonjwa',
      analytics: 'Uchambuzi',
      discharge: 'Kuondoka',
      tasks: 'Kazi',
      settings: 'Mipangilio',
      logout: 'Ondoka',
      welcome: 'Karibu',
      readmissionRate: 'Kiwango cha Kurudi',
      highRisk: 'Hatari ya Juu',
      avgStay: 'Wastani wa Kukaa',
      intervention: 'Ukamilishaji',
      todayDischarges: 'Wanaondoka Leo',
      actionQueue: 'Foleni ya Hatua',
      riskDistribution: 'Usambazaji wa Hatari',
      search: 'Tafuta wagonjwa...',
      viewDetails: 'Tazama Maelezo'
    }
  };

  const t = translations[language];

  // Navigation items based on role
  const navigationItems = [
    { id: 'dashboard', label: t.dashboard, icon: BarChart3, roles: ['all'] },
    { id: 'patients', label: t.patients, icon: Users, roles: ['all'] },
    { id: 'tasks', label: t.tasks, icon: CheckCircle, roles: ['all'] },
    { id: 'discharge', label: t.discharge, icon: FileText, roles: ['clinician', 'nurse', 'facility-manager'] },
    { id: 'analytics', label: t.analytics, icon: TrendingUp, roles: ['facility-manager', 'chmt', 'rhmt', 'moh'] },
    { id: 'data-quality', label: 'Data Quality', icon: Database, roles: ['hro', 'facility-manager', 'data-steward'] }
  ];

  const filteredNavItems = navigationItems.filter(
    item => item.roles.includes('all') || item.roles.includes(userRole)
  );

  // Render landing page
  if (currentPage === 'landing') {
    return <LandingPage onLogin={() => setCurrentPage('login')} />;
  }

  // Render login page
  if (currentPage === 'login') {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onBack={() => setCurrentPage('landing')}
      />
    );
  }

  // Dashboard Component
  const Dashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {t.welcome}, Dr. Samwel Mhagama
          </h1>
          <p className="text-gray-600">
            {selectedFacility.name} · {selectedFacility.region}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-teal-500 outline-none">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t.readmissionRate}
          value="8.4%"
          change="2.1% lower"
          trend="up"
          icon={TrendingUp}
          color="teal"
        />
        <KPICard
          title={t.highRisk}
          value="23"
          change="5 more than avg"
          trend="down"
          icon={Activity}
          color="red"
        />
        <KPICard
          title={t.avgStay}
          value="4.8 days"
          change="0.3 days shorter"
          trend="up"
          icon={CheckCircle}
          color="purple"
        />
        <KPICard
          title={t.intervention}
          value="92%"
          change="6% higher"
          trend="up"
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Discharges */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t.todayDischarges}</h2>
            <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
          </div>
          
          <div className="space-y-4">
            {SAMPLE_PATIENTS.slice(0, 4).map((patient) => (
              <div
                key={patient.id}
                className="p-4 border-2 border-gray-100 rounded-lg hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedPatient(patient);
                  setCurrentView('patient-detail');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">{patient.name}</h3>
                      <Badge variant="default">{patient.id}</Badge>
                      <Badge variant={patient.riskTier.toLowerCase()}>
                        {patient.riskTier} Risk
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {patient.age}y · {patient.gender} · {patient.ward}
                    </p>
                    <p className="text-sm font-medium text-gray-700">{patient.diagnosis.primary}</p>
                    
                    {/* Intervention badges */}
                    <div className="flex items-center gap-2 mt-2">
                      {patient.interventionsNeeded?.slice(0, 3).map((intervention, idx) => (
                        <Badge 
                          key={idx}
                          variant={intervention.priority === 'high' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {intervention.type.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <RiskScoreDisplay score={patient.riskScore} tier={patient.riskTier} size="sm" />
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full mt-4"
            onClick={() => setCurrentView('patients')}
          >
            View All Patients
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>

        {/* Action Queue */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t.actionQueue}</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">High Risk - No Discharge Plan</p>
                  <p className="text-xs text-gray-600 mt-1">Amina Mwambungu (PT-2025-0847)</p>
                  <p className="text-xs text-red-600 mt-2 font-medium">Due: 2 hours ago</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Medication Reconciliation</p>
                  <p className="text-xs text-gray-600 mt-1">Grace Massawe (PT-2025-0856)</p>
                  <p className="text-xs text-amber-600 mt-2 font-medium">Due: Today 3:00 PM</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">7-Day Follow-up Call</p>
                  <p className="text-xs text-gray-600 mt-1">12 patients pending</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Scheduled: Tomorrow</p>
                </div>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            className="w-full mt-4"
            onClick={() => setCurrentView('tasks')}
          >
            View All Tasks
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      </div>

      {/* Risk Distribution Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t.riskDistribution}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-6 bg-emerald-50 rounded-xl border-2 border-emerald-200">
            <p className="text-4xl font-bold text-emerald-700 mb-2">156</p>
            <p className="text-sm font-semibold text-emerald-600">Low Risk</p>
            <p className="text-xs text-gray-600 mt-1">72% of discharges</p>
          </div>
          <div className="text-center p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
            <p className="text-4xl font-bold text-amber-700 mb-2">45</p>
            <p className="text-sm font-semibold text-amber-600">Medium Risk</p>
            <p className="text-xs text-gray-600 mt-1">21% of discharges</p>
          </div>
          <div className="text-center p-6 bg-red-50 rounded-xl border-2 border-red-200">
            <p className="text-4xl font-bold text-red-700 mb-2">16</p>
            <p className="text-sm font-semibold text-red-600">High Risk</p>
            <p className="text-xs text-gray-600 mt-1">7% of discharges</p>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="lg:hidden">
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">TRIP</h1>
                  <p className="text-xs text-gray-500">Readmission Intelligence</p>
                </div>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-gray-600">National</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{selectedFacility.region}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{selectedFacility.district}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-900">{selectedFacility.name}</span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                {language === 'en' ? 'EN' : 'SW'}
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-3 border-l-2 border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">Dr. Samwel Mhagama</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole?.replace('-', ' ')}</p>
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
        {/* Sidebar */}
        <div className={`
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          bg-white border-r-2 border-gray-200 min-h-screen transition-all duration-300
          fixed lg:sticky top-[73px] z-40
          ${sidebarCollapsed && 'lg:block hidden'}
        `}>
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
                    ${isActive 
                      ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg' 
                      : 'hover:bg-gray-100 text-gray-700'
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
                <span className="font-medium text-sm">{t.settings}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-all mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">{t.logout}</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 lg:p-8">
          {currentView === 'dashboard' && <Dashboard />}
          
          {currentView === 'patients' && (
            <PatientsList 
              onPatientSelect={(patient) => {
                setSelectedPatient(patient);
                setCurrentView('patient-detail');
              }}
            />
          )}
          
          {currentView === 'patient-detail' && selectedPatient && (
            <PatientDetail
              patient={selectedPatient}
              onBack={() => {
                setSelectedPatient(null);
                setCurrentView('patients');
              }}
              onStartDischarge={() => setCurrentView('discharge')}
            />
          )}
          
          {currentView === 'discharge' && (
            <DischargeWorkflow
              patient={selectedPatient || SAMPLE_PATIENTS[0]}
              onBack={() => setCurrentView(selectedPatient ? 'patient-detail' : 'patients')}
              onComplete={() => {
                alert('Discharge workflow completed!');
                setCurrentView('dashboard');
              }}
            />
          )}
          
          {currentView === 'tasks' && (
            <Tasks 
              onPatientSelect={(patient) => {
                setSelectedPatient(patient);
                setCurrentView('patient-detail');
              }}
            />
          )}
          
          {currentView === 'analytics' && <Analytics />}
          
          {currentView === 'data-quality' && (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Database className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Data Quality Dashboard</h3>
              <p className="text-gray-600">This feature is under development.</p>
              <Button 
                variant="primary"
                onClick={() => setCurrentView('dashboard')}
                className="mt-6"
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="fixed top-20 right-6 w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-700">
            <h3 className="font-bold text-white">Notifications</h3>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-semibold text-red-900">High Risk Patient</p>
              <p className="text-xs text-red-700 mt-1">Amina Mwambungu requires discharge plan</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">Follow-up Due</p>
              <p className="text-xs text-blue-700 mt-1">12 patients need 7-day calls</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">Data Quality Improved</p>
              <p className="text-xs text-emerald-700 mt-1">Missing data down 15% this week</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t-2 border-gray-200 px-6 py-4 text-center">
        <p className="text-xs text-gray-500">
          Tanzania Readmission Intelligence Platform (TRIP) · Ministry of Health · 
          <span className="text-teal-600 font-semibold ml-1">Secure · Auditable · AI-Powered</span>
        </p>
      </div>
    </div>
  );
};

export default App;
