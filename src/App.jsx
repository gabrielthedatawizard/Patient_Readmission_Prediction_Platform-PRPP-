import React, { useState, useEffect } from 'react';
import { AlertCircle, Activity, Users, TrendingUp, Calendar, MapPin, Bell, Settings, LogOut, ChevronRight, ChevronDown, Search, Filter, Download, Plus, Check, X, Clock, AlertTriangle, Shield, BarChart3, FileText, Phone, Home, Stethoscope, Pill, Database, Eye, RefreshCw, ChevronLeft, Menu, Globe, Info, Lock, Unlock, Target, Award, Heart, Zap, MessageSquare, Edit, Save, ArrowRight, ArrowLeft, Upload, User, Building, Map } from 'lucide-react';

// Comprehensive Design System for TRIP
const TRIP_COLORS = {
  // Primary Clinical Palette - Sophisticated teal/blue medical system
  primary: {
    50: '#E6F7F7',
    100: '#B3E8E8',
    200: '#80D9D9',
    300: '#4DCACA',
    400: '#26B8B8',
    500: '#00A6A6',
    600: '#008F8F',
    700: '#007878',
    800: '#006161',
    900: '#004A4A'
  },
  // Risk Level Colors
  risk: {
    low: '#10B981',
    lowBg: '#D1FAE5',
    medium: '#F59E0B',
    mediumBg: '#FEF3C7',
    high: '#EF4444',
    highBg: '#FEE2E2'
  },
  // Neutral Professional Grays
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  // Accent Colors
  accent: {
    purple: '#8B5CF6',
    pink: '#EC4899',
    amber: '#F59E0B',
    emerald: '#10B981',
    sky: '#0EA5E9'
  }
};

// Sample Tanzania Health System Data
const TANZANIA_REGIONS = [
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 
  'Tanga', 'Kagera', 'Mara', 'Kilimanjaro', 'Tabora', 'Kigoma'
];

const SAMPLE_FACILITIES = [
  { id: 1, name: 'Muhimbili National Hospital', region: 'Dar es Salaam', district: 'Ilala', type: 'National Referral', beds: 1500 },
  { id: 2, name: 'Bugando Medical Centre', region: 'Mwanza', district: 'Nyamagana', type: 'Zonal Referral', beds: 900 },
  { id: 3, name: 'Mbeya Zonal Referral Hospital', region: 'Mbeya', district: 'Mbeya Urban', type: 'Zonal Referral', beds: 600 },
  { id: 4, name: 'Temeke Regional Hospital', region: 'Dar es Salaam', district: 'Temeke', type: 'Regional', beds: 400 },
  { id: 5, name: 'Kilosa District Hospital', region: 'Morogoro', district: 'Kilosa', type: 'District', beds: 150 },
  { id: 6, name: 'Kibaha Health Centre', region: 'Pwani', district: 'Kibaha', type: 'Health Centre', beds: 50 }
];

const SAMPLE_PATIENTS = [
  {
    id: 'PT-2025-0847',
    name: 'Amina Mwambungu',
    age: 67,
    gender: 'Female',
    facility: 'Muhimbili National Hospital',
    ward: 'Medical Ward B',
    admissionDate: '2025-01-20',
    diagnosis: 'Heart Failure, Type 2 Diabetes',
    riskScore: 78,
    riskTier: 'High',
    priorAdmissions: 3,
    lengthOfStay: 12,
    riskFactors: [
      { factor: 'Multiple prior admissions (3 in 6 months)', weight: 0.35 },
      { factor: 'Comorbidities: Diabetes + Heart Failure', weight: 0.28 },
      { factor: 'Extended length of stay (12 days)', weight: 0.18 },
      { factor: 'Missing lab values (eGFR, HbA1c)', weight: 0.12 },
      { factor: 'Age > 65 years', weight: 0.07 }
    ]
  },
  {
    id: 'PT-2025-0921',
    name: 'Joseph Kitwanga',
    age: 45,
    gender: 'Male',
    facility: 'Muhimbili National Hospital',
    ward: 'Surgical Ward A',
    admissionDate: '2025-01-28',
    diagnosis: 'Appendectomy',
    riskScore: 23,
    riskTier: 'Low',
    priorAdmissions: 0,
    lengthOfStay: 3,
    riskFactors: [
      { factor: 'Uncomplicated surgery', weight: -0.15 },
      { factor: 'No prior admissions', weight: -0.20 },
      { factor: 'Normal post-op recovery', weight: -0.10 }
    ]
  },
  {
    id: 'PT-2025-0856',
    name: 'Grace Massawe',
    age: 52,
    gender: 'Female',
    facility: 'Temeke Regional Hospital',
    ward: 'Medical Ward C',
    admissionDate: '2025-01-25',
    diagnosis: 'Pneumonia',
    riskScore: 54,
    riskTier: 'Medium',
    priorAdmissions: 1,
    lengthOfStay: 7,
    riskFactors: [
      { factor: 'Chronic respiratory condition', weight: 0.22 },
      { factor: 'One prior admission (4 months ago)', weight: 0.18 },
      { factor: 'Social support concerns noted', weight: 0.14 }
    ]
  }
];

// Design System Components
const Card = ({ children, className = '', gradient = false, glass = false }) => (
  <div className={`
    ${glass ? 'bg-white/80 backdrop-blur-lg border border-white/20' : 'bg-white'}
    ${gradient ? 'bg-gradient-to-br from-white to-gray-50' : ''}
    rounded-xl shadow-lg hover:shadow-xl transition-all duration-300
    ${className}
  `}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-teal-100 text-teal-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700'
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', icon, className = '', onClick, disabled = false }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-gray-100 text-gray-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} ${sizes[size]}
        rounded-lg font-semibold transition-all duration-200
        flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

const KPICard = ({ title, value, change, trend, icon: Icon, color = 'teal' }) => {
  const colorClasses = {
    teal: 'from-teal-500 to-teal-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600'
  };
  
  return (
    <Card className="p-6 hover:scale-105 transition-transform duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {change && (
            <div className="flex items-center gap-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
              )}
              <span className={`text-sm font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
};

const RiskScoreDisplay = ({ score, tier, size = 'md' }) => {
  const sizes = {
    sm: { container: 'w-16 h-16', text: 'text-lg' },
    md: { container: 'w-24 h-24', text: 'text-2xl' },
    lg: { container: 'w-32 h-32', text: 'text-3xl' }
  };
  
  const tierColors = {
    Low: { bg: 'from-emerald-400 to-emerald-600', text: 'text-emerald-700' },
    Medium: { bg: 'from-amber-400 to-amber-600', text: 'text-amber-700' },
    High: { bg: 'from-red-400 to-red-600', text: 'text-red-700' }
  };
  
  const colors = tierColors[tier] || tierColors.Low;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`
        ${sizes[size].container}
        rounded-full bg-gradient-to-br ${colors.bg}
        flex items-center justify-center shadow-xl
        relative overflow-hidden
      `}>
        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        <span className={`${sizes[size].text} font-bold text-white relative z-10`}>{score}</span>
      </div>
      <Badge variant={tier.toLowerCase()}>{tier} Risk</Badge>
    </div>
  );
};

// Main Application Component
const TRIPPlatform = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRole, setSelectedRole] = useState('facility-manager');
  const [selectedFacility, setSelectedFacility] = useState(SAMPLE_FACILITIES[0]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('30d');

  // Translations
  const t = {
    en: {
      dashboard: 'Dashboard',
      patients: 'Patients',
      analytics: 'Analytics',
      discharge: 'Discharge Workflow',
      tasks: 'Tasks & Follow-up',
      dataQuality: 'Data Quality',
      modelOps: 'Model Operations',
      settings: 'Settings',
      logout: 'Logout',
      welcome: 'Welcome',
      readmissionRate: '30-Day Readmission Rate',
      highRiskDischarges: 'High-Risk Discharges',
      avgLengthOfStay: 'Avg Length of Stay',
      interventionRate: 'Intervention Completion',
      todayDischarges: "Today's Discharges",
      actionQueue: 'Action Queue',
      riskDistribution: 'Risk Distribution',
      search: 'Search patients...',
      viewDetails: 'View Details',
      completeDischarge: 'Complete Discharge',
      assignTask: 'Assign Task'
    },
    sw: {
      dashboard: 'Dashibodi',
      patients: 'Wagonjwa',
      analytics: 'Uchambuzi',
      discharge: 'Mchakato wa Kuondoka',
      tasks: 'Kazi na Ufuatiliaji',
      dataQuality: 'Ubora wa Data',
      modelOps: 'Uendeshaji wa Modeli',
      settings: 'Mipangilio',
      logout: 'Ondoka',
      welcome: 'Karibu',
      readmissionRate: 'Kiwango cha Kurudi',
      highRiskDischarges: 'Hatari ya Juu',
      avgLengthOfStay: 'Wastani wa Kukaa',
      interventionRate: 'Ukamilishaji wa Hatua',
      todayDischarges: 'Wanaondoka Leo',
      actionQueue: 'Foleni ya Hatua',
      riskDistribution: 'Usambazaji wa Hatari',
      search: 'Tafuta wagonjwa...',
      viewDetails: 'Tazama Maelezo',
      completeDischarge: 'Kamilisha Kuondoka',
      assignTask: 'Kabidhi Kazi'
    }
  };

  const tr = t[language];

  // Navigation items based on role
  const navigationItems = [
    { id: 'dashboard', label: tr.dashboard, icon: BarChart3, roles: ['all'] },
    { id: 'patients', label: tr.patients, icon: Users, roles: ['all'] },
    { id: 'discharge', label: tr.discharge, icon: FileText, roles: ['clinician', 'nurse', 'facility-manager'] },
    { id: 'tasks', label: tr.tasks, icon: Check, roles: ['all'] },
    { id: 'analytics', label: tr.analytics, icon: TrendingUp, roles: ['facility-manager', 'chmt', 'rhmt', 'moh'] },
    { id: 'data-quality', label: tr.dataQuality, icon: Database, roles: ['hro', 'facility-manager', 'data-steward'] },
    { id: 'model-ops', label: tr.modelOps, icon: Activity, roles: ['ml-engineer', 'data-steward'] }
  ];

  // Login Screen
  const LoginScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>
      
      <Card className="w-full max-w-md p-8 relative z-10" glass>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl mb-4 shadow-2xl">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TRIP</h1>
          <p className="text-sm text-gray-600 font-medium">Tanzania Readmission Intelligence Platform</p>
          <p className="text-xs text-gray-500 mt-1">Ministry of Health · Republic of Tanzania</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email / Staff ID</label>
            <input
              type="text"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none"
              placeholder="staffid@moh.go.tz"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-teal-600 font-semibold hover:text-teal-700">Forgot password?</a>
          </div>

          <Button variant="primary" size="lg" className="w-full" onClick={() => setCurrentView('dashboard')}>
            <Lock className="w-4 h-4" />
            Sign In Securely
          </Button>

          <div className="flex items-center gap-2 mt-4">
            <Shield className="w-4 h-4 text-teal-600" />
            <p className="text-xs text-gray-600">
              MFA Required · SSO Ready · ISO 27001 Compliant
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-2">Select Role (Demo)</p>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-500 outline-none"
          >
            <option value="moh">MoH National Admin</option>
            <option value="rhmt">Regional Health Management Team</option>
            <option value="chmt">Council/District Health Management</option>
            <option value="facility-manager">Facility Manager</option>
            <option value="clinician">Clinician (Doctor/Clinical Officer)</option>
            <option value="nurse">Nurse / Discharge Coordinator</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="hro">Health Records Officer</option>
            <option value="chw">Community Health Worker</option>
            <option value="ml-engineer">ML Engineer / Data Steward</option>
          </select>
        </div>
      </Card>
    </div>
  );

  // Main Dashboard
  const Dashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {tr.welcome}, Dr. Samwel Mhagama
          </h1>
          <p className="text-gray-600">
            {selectedFacility.name} · {selectedFacility.region}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-teal-500 outline-none"
          >
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
          title={tr.readmissionRate}
          value="8.4%"
          change="2.1% lower"
          trend="up"
          icon={TrendingUp}
          color="teal"
        />
        <KPICard
          title={tr.highRiskDischarges}
          value="23"
          change="5 more than avg"
          trend="down"
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title={tr.avgLengthOfStay}
          value="4.8 days"
          change="0.3 days shorter"
          trend="up"
          icon={Clock}
          color="purple"
        />
        <KPICard
          title={tr.interventionRate}
          value="92%"
          change="6% higher"
          trend="up"
          icon={Check}
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Discharges */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{tr.todayDischarges}</h2>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
          
          <div className="space-y-4">
            {SAMPLE_PATIENTS.map((patient) => (
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
                    <p className="text-sm font-medium text-gray-700">{patient.diagnosis}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <RiskScoreDisplay score={patient.riskScore} tier={patient.riskTier} size="sm" />
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Queue */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{tr.actionQueue}</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">High Risk - No Discharge Plan</p>
                  <p className="text-xs text-gray-600 mt-1">Amina Mwambungu (PT-2025-0847)</p>
                  <p className="text-xs text-red-600 mt-2 font-medium">Due: 2 hours ago</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Medication Reconciliation</p>
                  <p className="text-xs text-gray-600 mt-1">Grace Massawe (PT-2025-0856)</p>
                  <p className="text-xs text-amber-600 mt-2 font-medium">Due: Today 3:00 PM</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">7-Day Follow-up Call</p>
                  <p className="text-xs text-gray-600 mt-1">12 patients pending</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Scheduled: Tomorrow</p>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="w-full justify-center mt-4">
              View All Tasks
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Risk Distribution Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{tr.riskDistribution}</h2>
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

  // Patient Detail View
  const PatientDetail = () => {
    if (!selectedPatient) return null;

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => setCurrentView('dashboard')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        {/* Patient Header */}
        <Card className="p-6" gradient>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-xl">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedPatient.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="default">{selectedPatient.id}</Badge>
                  <span className="text-gray-600">·</span>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedPatient.age} years · {selectedPatient.gender}
                  </span>
                  <span className="text-gray-600">·</span>
                  <span className="text-sm font-medium text-gray-700">{selectedPatient.ward}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Admitted: {new Date(selectedPatient.admissionDate).toLocaleDateString()} 
                  ({selectedPatient.lengthOfStay} days)
                </p>
              </div>
            </div>
            <RiskScoreDisplay score={selectedPatient.riskScore} tier={selectedPatient.riskTier} size="lg" />
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Explanation */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Info className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-900">Why This Risk Score?</h2>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium">
                <Shield className="w-4 h-4 inline mr-2" />
                Decision Support Tool - Not a Diagnosis
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This risk score is generated by AI to assist clinical decision-making. 
                Always use your clinical judgment and consider the full patient context.
              </p>
            </div>

            <h3 className="font-semibold text-gray-900 mb-4">Top Risk Factors:</h3>
            
            <div className="space-y-3">
              {selectedPatient.riskFactors.map((factor, idx) => (
                <div key={idx} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">{factor.factor}</p>
                    <span className="text-sm font-bold text-teal-600">
                      {Math.abs(factor.weight * 100).toFixed(0)}% influence
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${factor.weight > 0 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}
                      style={{ width: `${Math.abs(factor.weight) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Data Quality Note</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Missing lab values (eGFR, HbA1c) may affect prediction confidence. 
                    Consider ordering these tests before discharge.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <p className="text-xs text-gray-600 mb-2">
                <Database className="w-4 h-4 inline mr-1" />
                Data Sources Used:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">EMR Records</Badge>
                <Badge variant="default">Lab Results</Badge>
                <Badge variant="default">Prior Admissions</Badge>
                <Badge variant="default">Medications</Badge>
                <Badge variant="default">Social History</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Model: TRIP-v2.3 · Calibrated: Jan 2025 · AUC: 0.84
              </p>
            </div>
          </Card>

          {/* Recommended Interventions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">What To Do Now</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-teal-600" />
                  <p className="font-semibold text-sm text-teal-900">Discharge Planning</p>
                </div>
                <ul className="text-xs text-teal-800 space-y-1 ml-6 list-disc">
                  <li>Complete comprehensive discharge plan</li>
                  <li>Schedule follow-up within 7 days</li>
                  <li>Ensure transport arranged</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-purple-600" />
                  <p className="font-semibold text-sm text-purple-900">Medication</p>
                </div>
                <ul className="text-xs text-purple-800 space-y-1 ml-6 list-disc">
                  <li>Medication reconciliation required</li>
                  <li>Patient education on adherence</li>
                  <li>Consider pill organizer</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <p className="font-semibold text-sm text-blue-900">Follow-up</p>
                </div>
                <ul className="text-xs text-blue-800 space-y-1 ml-6 list-disc">
                  <li>Phone call at day 3, 7, 14</li>
                  <li>Home visit if available</li>
                  <li>Emergency contact provided</li>
                </ul>
              </div>

              <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  <p className="font-semibold text-sm text-emerald-900">Patient Education</p>
                </div>
                <ul className="text-xs text-emerald-800 space-y-1 ml-6 list-disc">
                  <li>Warning signs review</li>
                  <li>Self-care instructions (Swahili)</li>
                  <li>Caregiver training</li>
                </ul>
              </div>
            </div>

            <Button variant="primary" size="md" className="w-full mt-6" onClick={() => setCurrentView('discharge')}>
              <FileText className="w-4 h-4" />
              Start Discharge Workflow
            </Button>
          </Card>
        </div>

        {/* Clinical History */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Clinical History</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-teal-500 pl-4">
              <p className="text-sm font-semibold text-gray-900">Current Admission</p>
              <p className="text-sm text-gray-700 mt-1">{selectedPatient.diagnosis}</p>
              <p className="text-xs text-gray-500 mt-1">
                Admitted: {new Date(selectedPatient.admissionDate).toLocaleDateString()} · 
                LOS: {selectedPatient.lengthOfStay} days
              </p>
            </div>

            {selectedPatient.priorAdmissions > 0 && (
              <>
                <div className="border-l-4 border-amber-500 pl-4">
                  <p className="text-sm font-semibold text-gray-900">Previous Admission (4 months ago)</p>
                  <p className="text-sm text-gray-700 mt-1">Heart Failure Exacerbation</p>
                  <p className="text-xs text-gray-500 mt-1">LOS: 8 days · Readmitted after 18 days</p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-sm font-semibold text-gray-900">Previous Admission (7 months ago)</p>
                  <p className="text-sm text-gray-700 mt-1">Diabetic Ketoacidosis</p>
                  <p className="text-xs text-gray-500 mt-1">LOS: 5 days · ICU 2 days</p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // Discharge Workflow
  const DischargeWorkflow = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const steps = [
      { id: 'clinical', label: 'Clinical Readiness', icon: Stethoscope },
      { id: 'medication', label: 'Medication Reconciliation', icon: Pill },
      { id: 'education', label: 'Patient Education', icon: MessageSquare },
      { id: 'followup', label: 'Follow-up Plan', icon: Calendar },
      { id: 'referral', label: 'Referral & Community', icon: Home },
      { id: 'summary', label: 'Discharge Summary', icon: FileText }
    ];

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setCurrentView('patient-detail')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Patient
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Discharge Workflow</h1>
          
          {/* Progress Stepper */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2
                      ${isCompleted ? 'bg-teal-600 text-white' : 
                        isActive ? 'bg-teal-100 text-teal-700 border-2 border-teal-600' : 
                        'bg-gray-200 text-gray-500'}
                      transition-all duration-300
                    `}>
                      {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <p className={`text-xs font-medium text-center ${isActive ? 'text-teal-700' : 'text-gray-600'}`}>
                      {step.label}
                    </p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 ${isCompleted ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="bg-gray-50 rounded-xl p-6 min-h-96">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Clinical Readiness Checklist</h2>
                
                <div className="space-y-3">
                  {[
                    'Vital signs stable for 24 hours',
                    'Pain controlled on oral medications',
                    'Able to tolerate oral intake',
                    'No active infections requiring IV therapy',
                    'Lab values within acceptable range',
                    'Clinical team approves discharge'
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-teal-300 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 text-teal-600 rounded" />
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Medication Reconciliation</h2>
                
                <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left text-sm font-semibold text-gray-700 pb-2">Medication</th>
                        <th className="text-left text-sm font-semibold text-gray-700 pb-2">Dose</th>
                        <th className="text-left text-sm font-semibold text-gray-700 pb-2">Frequency</th>
                        <th className="text-left text-sm font-semibold text-gray-700 pb-2">Continue?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Furosemide', dose: '40mg', freq: 'Daily' },
                        { name: 'Metformin', dose: '500mg', freq: 'BID' },
                        { name: 'Enalapril', dose: '10mg', freq: 'Daily' }
                      ].map((med, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-3 text-sm text-gray-900">{med.name}</td>
                          <td className="py-3 text-sm text-gray-700">{med.dose}</td>
                          <td className="py-3 text-sm text-gray-700">{med.freq}</td>
                          <td className="py-3">
                            <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" defaultChecked />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Adherence Risk Detected</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Patient has history of non-adherence. Consider:
                        • Pill organizer • Simplified regimen • Caregiver support
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="success">
                <Check className="w-4 h-4" />
                Complete Discharge
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // Analytics View
  const Analytics = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics & Benchmarking</h1>

      {/* Facility Comparison */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Facility Performance Comparison</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left text-sm font-semibold text-gray-700 pb-3">Facility</th>
                <th className="text-left text-sm font-semibold text-gray-700 pb-3">Region</th>
                <th className="text-left text-sm font-semibold text-gray-700 pb-3">Readmission Rate</th>
                <th className="text-left text-sm font-semibold text-gray-700 pb-3">High Risk %</th>
                <th className="text-left text-sm font-semibold text-gray-700 pb-3">Intervention Rate</th>
                <th className="text-left text-sm font-semibold text-gray-700 pb-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_FACILITIES.map((facility, idx) => {
                const rates = [
                  { rate: 8.4, high: 7, intervention: 92 },
                  { rate: 11.2, high: 12, intervention: 78 },
                  { rate: 9.8, high: 9, intervention: 85 },
                  { rate: 7.1, high: 5, intervention: 95 },
                  { rate: 13.5, high: 15, intervention: 71 },
                  { rate: 10.2, high: 11, intervention: 82 }
                ][idx];
                
                return (
                  <tr key={facility.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 text-sm font-medium text-gray-900">{facility.name}</td>
                    <td className="py-4 text-sm text-gray-700">{facility.region}</td>
                    <td className="py-4">
                      <span className={`text-sm font-semibold ${rates.rate < 9 ? 'text-emerald-600' : rates.rate > 11 ? 'text-red-600' : 'text-amber-600'}`}>
                        {rates.rate}%
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-700">{rates.high}%</td>
                    <td className="py-4 text-sm text-gray-700">{rates.intervention}%</td>
                    <td className="py-4">
                      <TrendingUp className={`w-5 h-5 ${rates.rate < 9 ? 'text-emerald-600' : 'text-red-600 rotate-180'}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button variant="ghost">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </Button>
        </div>
      </Card>

      {/* Model Performance */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Model Performance Monitoring</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
            <p className="text-sm font-medium text-teal-900 mb-1">AUC Score</p>
            <p className="text-3xl font-bold text-teal-700">0.84</p>
            <p className="text-xs text-teal-600 mt-1">Target: >0.80</p>
          </div>
          
          <div className="p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
            <p className="text-sm font-medium text-emerald-900 mb-1">Calibration</p>
            <p className="text-3xl font-bold text-emerald-700">Good</p>
            <p className="text-xs text-emerald-600 mt-1">Last check: 5 days ago</p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-1">Drift Status</p>
            <p className="text-3xl font-bold text-blue-700">Stable</p>
            <p className="text-xs text-blue-600 mt-1">No action required</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // Main App Layout
  if (currentView === 'login') {
    return <LoginScreen />;
  }

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
                  <p className="text-xs text-gray-500 capitalize">{selectedRole.replace('-', ' ')}</p>
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
            {navigationItems
              .filter(item => item.roles.includes('all') || item.roles.includes(selectedRole))
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
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
                <span className="font-medium text-sm">{tr.settings}</span>
              </button>
              <button
                onClick={() => setCurrentView('login')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-all mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">{tr.logout}</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 lg:p-8">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'patient-detail' && <PatientDetail />}
          {currentView === 'discharge' && <DischargeWorkflow />}
          {currentView === 'analytics' && <Analytics />}
          {currentView === 'patients' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Patient Search</h1>
              <Card className="p-6">
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={tr.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                    />
                  </div>
                  <Button variant="secondary">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {SAMPLE_PATIENTS.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-4 border-2 border-gray-100 rounded-lg hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setCurrentView('patient-detail');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900">{patient.name}</h3>
                            <Badge variant="default">{patient.id}</Badge>
                            <Badge variant={patient.riskTier.toLowerCase()}>{patient.riskTier} Risk</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {patient.age}y · {patient.gender} · {patient.ward} · {patient.diagnosis}
                          </p>
                        </div>
                        <RiskScoreDisplay score={patient.riskScore} tier={patient.riskTier} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
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

export default TRIPPlatform;
