import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  History,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import Button from "../common/Button";
import KPICard from "../common/KPICard";
import InteractiveChart from "./InteractiveChart";
import {
  exportAnalyticsPdf,
  exportFacilitiesCsv,
} from "../../services/exportService";
import { fetchAuditLogs } from "../../services/apiClient";
import { isFeatureEnabled } from "../../services/featureFlags";
import {
  fetchAnomalies,
  fetchDashboardKPIs,
  fetchFacilityComparison,
} from "../../services/analyticsDataService";

const seedFacilityData = [
  { id: "FAC-001", name: "Muhimbili National Hospital", region: "Dar es Salaam", readmissionRate: 8.4, highRisk: 7, intervention: 92, trend: "down", beds: 1500 },
  { id: "FAC-002", name: "Bugando Medical Centre", region: "Mwanza", readmissionRate: 11.2, highRisk: 12, intervention: 78, trend: "up", beds: 900 },
  { id: "FAC-003", name: "KCMC", region: "Kilimanjaro", readmissionRate: 9.8, highRisk: 9, intervention: 85, trend: "down", beds: 630 },
  { id: "FAC-005", name: "Temeke Regional Hospital", region: "Dar es Salaam", readmissionRate: 7.1, highRisk: 5, intervention: 95, trend: "down", beds: 400 },
  { id: "FAC-007", name: "Kilosa District Hospital", region: "Morogoro", readmissionRate: 13.5, highRisk: 15, intervention: 71, trend: "up", beds: 150 },
];

const monthlyTrend = [
  { month: "Oct", actual: 10.2, predicted: 9.8 },
  { month: "Nov", actual: 9.8, predicted: 9.5 },
  { month: "Dec", actual: 9.2, predicted: 9.0 },
  { month: "Jan", actual: 8.4, predicted: 8.2 },
  { month: "Feb", actual: 8.1, predicted: 8.0 },
];

const modelMonitoring = [
  { month: "Oct", auc: 0.81, sensitivity: 0.78, specificity: 0.75 },
  { month: "Nov", auc: 0.82, sensitivity: 0.79, specificity: 0.76 },
  { month: "Dec", auc: 0.83, sensitivity: 0.80, specificity: 0.77 },
  { month: "Jan", auc: 0.84, sensitivity: 0.82, specificity: 0.79 },
  { month: "Feb", auc: 0.84, sensitivity: 0.82, specificity: 0.79 },
];

const modelMetrics = {
  auc: 0.84,
  sensitivity: 0.82,
  specificity: 0.79,
  ppv: 0.68,
  calibration: "Good",
  driftStatus: "Stable",
  version: "TRIP-v2.3",
};

const DAYS_LOOKUP = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

const Analytics = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditRestricted, setAuditRestricted] = useState(false);
  const [hasLoadedAudit, setHasLoadedAudit] = useState(false);
  const [dashboardKPIs, setDashboardKPIs] = useState(null);
  const [facilityData, setFacilityData] = useState(seedFacilityData);
  const [liveAnomalies, setLiveAnomalies] = useState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const auditTrailEnabled = isFeatureEnabled("analyticsAuditTrail");
  const pdfExportEnabled = isFeatureEnabled("analyticsPdfExport");

  const regions = useMemo(
    () => ["all", ...Array.from(new Set(facilityData.map((facility) => facility.region)))],
    [facilityData],
  );
  const tabs = useMemo(() => {
    const configuredTabs = [
      { id: "overview", label: "Overview", icon: BarChart3 },
      { id: "facilities", label: "Facility Comparison", icon: Building2 },
      { id: "model", label: "Model Monitoring", icon: Activity },
    ];

    if (auditTrailEnabled) {
      configuredTabs.push({ id: "audit", label: "Audit Trail", icon: History });
    }

    return configuredTabs;
  }, [auditTrailEnabled]);

  const filteredFacilities = useMemo(() => {
    if (selectedRegion === "all") {
      return facilityData;
    }
    return facilityData.filter((facility) => facility.region === selectedRegion);
  }, [selectedRegion, facilityData]);

  const aggregates = useMemo(() => {
    if (dashboardKPIs) {
      const estimatedDischarges = Math.max(Number(dashboardKPIs.totalPatients || 0), 1);
      const highRiskCount = Number(dashboardKPIs.highRiskCount || 0);
      const mediumRiskCount = Math.max(
        Math.round(estimatedDischarges * 0.24),
        0,
      );
      const lowRiskCount = Math.max(
        estimatedDischarges - highRiskCount - mediumRiskCount,
        0,
      );

      return {
        avgReadmission: Number(dashboardKPIs.readmissionRate || 0),
        avgHighRisk: estimatedDischarges
          ? (highRiskCount / estimatedDischarges) * 100
          : 0,
        avgIntervention: Number(dashboardKPIs.interventionRate || 0),
        estimatedDischarges,
        lowRiskCount,
        mediumRiskCount,
        highRiskCount,
      };
    }

    const totalFacilities = Math.max(filteredFacilities.length, 1);
    const avgReadmission =
      filteredFacilities.reduce((acc, row) => acc + row.readmissionRate, 0) / totalFacilities;
    const avgHighRisk =
      filteredFacilities.reduce((acc, row) => acc + row.highRisk, 0) / totalFacilities;
    const avgIntervention =
      filteredFacilities.reduce((acc, row) => acc + row.intervention, 0) / totalFacilities;
    const totalBeds = filteredFacilities.reduce((acc, row) => acc + row.beds, 0);
    const estimatedDischarges = Math.max(Math.round(totalBeds * 0.18), 1);
    const highRiskCount = Math.round((avgHighRisk / 100) * estimatedDischarges);
    const mediumRiskCount = Math.round(estimatedDischarges * 0.24);
    const lowRiskCount = Math.max(estimatedDischarges - highRiskCount - mediumRiskCount, 0);

    return {
      avgReadmission,
      avgHighRisk,
      avgIntervention,
      estimatedDischarges,
      lowRiskCount,
      mediumRiskCount,
      highRiskCount,
    };
  }, [dashboardKPIs, filteredFacilities]);

  const getTrendIcon = (trend) =>
    trend === "down" ? (
      <TrendingDown className="w-5 h-5 text-emerald-600" />
    ) : (
      <TrendingUp className="w-5 h-5 text-red-600" />
    );

  const getTrendText = (trend) => (trend === "down" ? "Improving" : "Needs Attention");

  const handleExportCsv = () => {
    exportFacilitiesCsv(filteredFacilities);
  };

  const handleExportPdf = async () => {
    setIsExportingReport(true);
    try {
      await exportAnalyticsPdf({
        title: "TRIP Analytics and Benchmarking",
        subtitle:
          selectedRegion === "all"
            ? `Coverage: All Regions | Window: ${dateRange}`
            : `Coverage: ${selectedRegion} | Window: ${dateRange}`,
        metrics: [
          { label: "Average Readmission Rate", value: `${aggregates.avgReadmission.toFixed(1)}%` },
          { label: "Average High-Risk Share", value: `${aggregates.avgHighRisk.toFixed(1)}%` },
          { label: "Average Intervention Completion", value: `${aggregates.avgIntervention.toFixed(0)}%` },
          { label: "Estimated Discharges", value: String(aggregates.estimatedDischarges) },
        ],
        facilities: filteredFacilities,
      });
    } finally {
      setIsExportingReport(false);
    }
  };

  const loadLiveAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const days = DAYS_LOOKUP[dateRange] || 30;
      const [kpis, facilities, anomalies] = await Promise.all([
        fetchDashboardKPIs({ days }),
        fetchFacilityComparison({ days }),
        fetchAnomalies({}),
      ]);

      setDashboardKPIs(kpis);
      setLiveAnomalies(anomalies);
      setLastRefresh(new Date());

      if (facilities.length > 0) {
        const normalized = facilities.map((facility) => {
          const highRiskShare = facility.totalPatients
            ? (facility.highRiskCount / facility.totalPatients) * 100
            : 0;
          const trend = facility.readmissionRate <= 10 ? "down" : "up";

          return {
            id: facility.facilityId,
            name: facility.facilityName,
            region: facility.region || "Unknown",
            readmissionRate: Number(facility.readmissionRate || 0),
            highRisk: Number(highRiskShare.toFixed(1)),
            intervention: Number(kpis?.interventionRate || 0),
            trend,
            beds: Number(facility.totalPatients || 0),
            avgRiskScore: Number(facility.avgRiskScore || 0),
          };
        });
        setFacilityData(normalized);
      } else {
        setFacilityData(seedFacilityData);
      }
    } catch (error) {
      setAnalyticsError(error?.message || "Failed to load live analytics.");
      setFacilityData(seedFacilityData);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLiveAnalytics();
    const timer = window.setInterval(loadLiveAnalytics, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [loadLiveAnalytics]);

  const loadAuditTrail = useCallback(async () => {
    if (!auditTrailEnabled) {
      return;
    }

    setIsAuditLoading(true);
    setAuditError("");
    setAuditRestricted(false);

    try {
      const logs = await fetchAuditLogs({ limit: 50 });
      setAuditLogs(logs);
    } catch (error) {
      if (error?.status === 403) {
        setAuditRestricted(true);
        return;
      }

      setAuditError(error?.message || "Unable to load audit trail.");
    } finally {
      setIsAuditLoading(false);
      setHasLoadedAudit(true);
    }
  }, [auditTrailEnabled]);

  useEffect(() => {
    if (
      activeTab !== "audit" ||
      !auditTrailEnabled ||
      isAuditLoading ||
      hasLoadedAudit
    ) {
      return;
    }

    loadAuditTrail();
  }, [activeTab, auditTrailEnabled, hasLoadedAudit, isAuditLoading, loadAuditTrail]);

  const formatAuditDetails = (details) => {
    if (!details) {
      return "No additional details";
    }

    if (typeof details === "string") {
      return details;
    }

    if (typeof details === "object") {
      return Object.entries(details)
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | ");
    }

    return String(details);
  };

  const actionBadgeVariant = (action) => {
    const normalized = String(action || "").toLowerCase();
    if (normalized.includes("error") || normalized.includes("failed")) {
      return "danger";
    }
    if (normalized.includes("create") || normalized.includes("generate")) {
      return "success";
    }
    if (normalized.includes("update") || normalized.includes("override")) {
      return "warning";
    }
    return "default";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics and Benchmarking</h1>
          <p className="text-gray-600 mt-1">Performance metrics, model trends, and facility comparison</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="w-full sm:w-auto px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <select
            value={selectedRegion}
            onChange={(event) => setSelectedRegion(event.target.value)}
            className="w-full sm:w-auto px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            {regions.map((region) => (
              <option key={region} value={region}>
                {region === "all" ? "All Regions" : region}
              </option>
            ))}
          </select>
          {pdfExportEnabled && (
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportPdf}
              loading={isExportingReport}
              disabled={!filteredFacilities.length}
            >
              Export Report
            </Button>
          )}
        </div>
      </div>

      {analyticsError && (
        <Card className="p-4 border-red-200 bg-red-50" hover={false}>
          <p className="text-sm text-red-700">{analyticsError}</p>
        </Card>
      )}

      {liveAnomalies.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50" hover={false}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                {liveAnomalies.length} anomaly{liveAnomalies.length === 1 ? "" : "ies"} detected
              </p>
              {liveAnomalies.map((anomaly, index) => (
                <div key={`${anomaly.type}-${index}`} className="text-sm text-amber-800">
                  <p>{anomaly.message}</p>
                  <p className="text-xs mt-1">
                    <strong>Action:</strong> {anomaly.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="30-Day Readmission Rate"
          value={`${aggregates.avgReadmission.toFixed(1)}%`}
          change={`${filteredFacilities.length} facilities`}
          trend={aggregates.avgReadmission < 10 ? "up" : "down"}
          icon={Activity}
          color="teal"
        />
        <KPICard
          title="High-Risk Share"
          value={`${aggregates.avgHighRisk.toFixed(1)}%`}
          change={`${aggregates.highRiskCount} estimated patients`}
          trend={aggregates.avgHighRisk < 10 ? "up" : "down"}
          icon={AlertCircle}
          color="amber"
        />
        <KPICard
          title="Intervention Completion"
          value={`${aggregates.avgIntervention.toFixed(0)}%`}
          change="Cross-facility average"
          trend={aggregates.avgIntervention >= 85 ? "up" : "down"}
          icon={CheckCircle}
          color="emerald"
        />
        <KPICard
          title="Est. Discharges"
          value={String(aggregates.estimatedDischarges)}
          change={`Window: ${dateRange}`}
          trend="up"
          icon={Clock}
          color="blue"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Last updated: {lastRefresh ? lastRefresh.toLocaleTimeString("sw-TZ") : "Not yet refreshed"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw className={`w-4 h-4 ${isAnalyticsLoading ? "animate-spin" : ""}`} />}
          onClick={loadLiveAnalytics}
          loading={isAnalyticsLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.id ? "text-teal-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InteractiveChart
                title="Readmission Trend (Actual vs Predicted)"
                data={monthlyTrend}
                series={[
                  { key: "actual", label: "Actual", color: "#00A6A6" },
                  { key: "predicted", label: "Predicted", color: "#3B82F6" },
                ]}
              />
            </div>
            <Card className="p-6" hover={false}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Risk Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">Low Risk</span>
                    <span className="text-sm font-semibold text-emerald-600">{aggregates.lowRiskCount}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${(aggregates.lowRiskCount / aggregates.estimatedDischarges) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">Medium Risk</span>
                    <span className="text-sm font-semibold text-amber-600">{aggregates.mediumRiskCount}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
                      style={{ width: `${(aggregates.mediumRiskCount / aggregates.estimatedDischarges) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">High Risk</span>
                    <span className="text-sm font-semibold text-red-600">{aggregates.highRiskCount}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-600"
                      style={{ width: `${(aggregates.highRiskCount / aggregates.estimatedDischarges) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Key Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="font-semibold text-emerald-900">Intervention Impact</p>
                <p className="text-sm text-emerald-700">
                  Facilities above 90% intervention completion are consistently below 9% readmission.
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-6 h-6 text-amber-600 mb-2" />
                <p className="font-semibold text-amber-900">High-Risk Window</p>
                <p className="text-sm text-amber-700">
                  First 14 days post-discharge remains the highest-risk period for repeat admission.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-semibold text-blue-900">Community Follow-up</p>
                <p className="text-sm text-blue-700">
                  CHW-linked discharges show stronger adherence and lower escalation rates.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "facilities" && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Facility Performance Comparison</h3>
            <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]" role="table" aria-label="Facility performance">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Facility</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Region</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Discharges</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Readmission</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">High-Risk</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Intervention</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFacilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{facility.name}</p>
                      <p className="text-xs text-gray-500">{facility.id}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.region}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.beds}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-sm font-bold ${
                          facility.readmissionRate < 9
                            ? "text-emerald-600"
                            : facility.readmissionRate > 11
                              ? "text-red-600"
                              : "text-amber-600"
                        }`}
                      >
                        {facility.readmissionRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.highRisk}%</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.intervention}%</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(facility.trend)}
                        <span
                          className={`text-sm ${
                            facility.trend === "down" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {getTrendText(facility.trend)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {pdfExportEnabled && (
              <Button
                variant="secondary"
                icon={<FileText className="w-4 h-4" />}
                onClick={handleExportPdf}
                loading={isExportingReport}
                disabled={!filteredFacilities.length}
              >
                Generate Report
              </Button>
            )}
            <Button
              variant="ghost"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
              disabled={!filteredFacilities.length}
            >
              Download CSV
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "model" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 sm:p-6" hover={false}>
              <p className="text-sm font-medium text-gray-600">AUC</p>
              <p className="text-4xl font-bold text-gray-900">{modelMetrics.auc.toFixed(2)}</p>
              <p className="text-sm text-emerald-600 mt-2">Target greater than 0.80</p>
            </Card>
            <Card className="p-4 sm:p-6" hover={false}>
              <p className="text-sm font-medium text-gray-600">Sensitivity</p>
              <p className="text-4xl font-bold text-gray-900">{(modelMetrics.sensitivity * 100).toFixed(0)}%</p>
              <p className="text-sm text-blue-600 mt-2">True positive capture</p>
            </Card>
            <Card className="p-4 sm:p-6" hover={false}>
              <p className="text-sm font-medium text-gray-600">Specificity</p>
              <p className="text-4xl font-bold text-gray-900">{(modelMetrics.specificity * 100).toFixed(0)}%</p>
              <p className="text-sm text-indigo-600 mt-2">False-positive control</p>
            </Card>
          </div>

          <InteractiveChart
            title="Model Monitoring (Monthly)"
            data={modelMonitoring}
            series={[
              { key: "auc", label: "AUC", color: "#00A6A6" },
              { key: "sensitivity", label: "Sensitivity", color: "#10B981" },
              { key: "specificity", label: "Specificity", color: "#3B82F6" },
            ]}
          />

          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Model Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Version</p>
                <p className="font-semibold text-gray-900">{modelMetrics.version}</p>
              </div>
              <div>
                <p className="text-gray-500">Calibration</p>
                <Badge variant={modelMetrics.calibration === "Good" ? "success" : "warning"}>
                  {modelMetrics.calibration}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Drift Status</p>
                <Badge variant={modelMetrics.driftStatus === "Stable" ? "success" : "warning"}>
                  {modelMetrics.driftStatus}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">PPV</p>
                <p className="font-semibold text-gray-900">{(modelMetrics.ppv * 100).toFixed(0)}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "audit" && auditTrailEnabled && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Audit Trail</h3>
              <p className="text-sm text-gray-600">
                Authentication, prediction, and intervention activity events
              </p>
            </div>
            <Button
              variant="ghost"
              icon={<Download className="w-4 h-4" />}
              onClick={loadAuditTrail}
              loading={isAuditLoading}
            >
              Refresh
            </Button>
          </div>

          {isAuditLoading && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          )}

          {!isAuditLoading && auditRestricted && (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
              Your role does not include permission to view audit logs.
            </div>
          )}

          {!isAuditLoading && !auditRestricted && auditError && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {auditError}
            </div>
          )}

          {!isAuditLoading && !auditRestricted && !auditError && !auditLogs.length && (
            <div className="p-6 rounded-lg border border-dashed border-gray-300 text-center text-sm text-gray-600">
              No audit events available in this time window.
            </div>
          )}

          {!isAuditLoading && !auditRestricted && !auditError && auditLogs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]" role="table" aria-label="Audit trail activity">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Time</th>
                    <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Actor</th>
                    <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Action</th>
                    <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Resource</th>
                    <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Facility</th>
                    <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                        {log.userId || "System"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={actionBadgeVariant(log.action)}>{log.action || "Unknown"}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{log.resource || "--"}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{log.facilityId || "--"}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatAuditDetails(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Analytics;
