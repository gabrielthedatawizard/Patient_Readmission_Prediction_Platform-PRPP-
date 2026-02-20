import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Download, Filter, Calendar,
  Building2, Users, Activity, FileText, ChevronDown,
  AlertCircle, CheckCircle, Clock, BarChart3
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import KPICard from '../common/KPICard';
import { SAMPLE_FACILITIES } from '../../data/facilities';

/**
 * Analytics Component
 * Dashboard for analytics, benchmarking, and reporting
 */

const Analytics = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for facility comparison
  const facilityData = [
    { id: 'FAC-001', name: 'Muhimbili National Hospital', region: 'Dar es Salaam', readmissionRate: 8.4, highRisk: 7, intervention: 92, trend: 'down', beds: 1500 },
    { id: 'FAC-002', name: 'Bugando Medical Centre', region: 'Mwanza', readmissionRate: 11.2, highRisk: 12, intervention: 78, trend: 'up', beds: 900 },
    { id: 'FAC-003', name: 'KCMC', region: 'Kilimanjaro', readmissionRate: 9.8, highRisk: 9, intervention: 85, trend: 'down', beds: 630 },
    { id: 'FAC-005', name: 'Temeke Regional Hospital', region: 'Dar es Salaam', readmissionRate: 7.1, highRisk: 5, intervention: 95, trend: 'down', beds: 400 },
    { id: 'FAC-007', name: 'Kilosa District Hospital', region: 'Morogoro', readmissionRate: 13.5, highRisk: 15, intervention: 71, trend: 'up', beds: 150 }
  ];

  // Risk distribution data
  const riskDistribution = {
    low: 156,
    medium: 45,
    high: 16,
    total: 217
  };

  // Monthly trend data
  const monthlyTrend = [
    { month: 'Oct', readmission: 10.2, prediction: 9.8 },
    { month: 'Nov', readmission: 9.8, prediction: 9.5 },
    { month: 'Dec', readmission: 9.2, prediction: 9.0 },
    { month: 'Jan', readmission: 8.4, prediction: 8.2 }
  ];

  // Model performance metrics
  const modelMetrics = {
    auc: 0.84,
    sensitivity: 0.82,
    specificity: 0.79,
    ppv: 0.68,
    calibration: 'Good',
    driftStatus: 'Stable'
  };

  const getTrendIcon = (trend) => {
    if (trend === 'down') {
      return <TrendingDown className="w-5 h-5 text-emerald-600" />;
    }
    return <TrendingUp className="w-5 h-5 text-red-600" />;
  };

  const getTrendText = (trend) => {
    return trend === 'down' ? 'Improving' : 'Needs Attention';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Benchmarking</h1>
          <p className="text-gray-600 mt-1">Performance metrics and facility comparison</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="30-Day Readmission Rate"
          value="8.4%"
          change="1.8% lower"
          trend="up"
          icon={Activity}
          color="teal"
        />
        <KPICard
          title="Avg Length of Stay"
          value="4.8 days"
          change="0.3 days shorter"
          trend="up"
          icon={Clock}
          color="blue"
        />
        <KPICard
          title="High-Risk Discharges"
          value="23"
          change="5 more than avg"
          trend="down"
          icon={AlertCircle}
          color="amber"
        />
        <KPICard
          title="Intervention Completion"
          value="92%"
          change="6% higher"
          trend="up"
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'facilities', label: 'Facility Comparison', icon: Building2 },
            { id: 'model', label: 'Model Performance', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Risk Distribution & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Risk Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Low Risk</span>
                    <span className="text-sm font-bold text-emerald-600">{riskDistribution.low}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${(riskDistribution.low / riskDistribution.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((riskDistribution.low / riskDistribution.total) * 100).toFixed(1)}% of discharges
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Medium Risk</span>
                    <span className="text-sm font-bold text-amber-600">{riskDistribution.medium}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                      style={{ width: `${(riskDistribution.medium / riskDistribution.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((riskDistribution.medium / riskDistribution.total) * 100).toFixed(1)}% of discharges
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">High Risk</span>
                    <span className="text-sm font-bold text-red-600">{riskDistribution.high}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-red-400 to-red-600"
                      style={{ width: `${(riskDistribution.high / riskDistribution.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((riskDistribution.high / riskDistribution.total) * 100).toFixed(1)}% of discharges
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Discharges</span>
                  <span className="text-xl font-bold text-gray-900">{riskDistribution.total}</span>
                </div>
              </div>
            </Card>

            {/* Monthly Trend */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Readmission Trend</h3>
              <div className="space-y-4">
                {monthlyTrend.map((data, idx) => (
                  <div key={data.month} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 w-12">{data.month}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-teal-500 rounded-full"
                            style={{ width: `${data.readmission * 8}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-teal-600 w-12">
                          {data.readmission}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full" />
                  <span className="text-sm text-gray-600">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-teal-200 rounded-full" />
                  <span className="text-sm text-gray-600">Predicted</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Key Insights */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Key Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="font-semibold text-emerald-900">Intervention Impact</p>
                <p className="text-sm text-emerald-700">
                  Facilities with 90%+ intervention completion show 25% lower readmission rates.
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-6 h-6 text-amber-600 mb-2" />
                <p className="font-semibold text-amber-900">High-Risk Focus</p>
                <p className="text-sm text-amber-700">
                  High-risk patients have 4x higher readmission rate. Priority follow-up recommended.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-semibold text-blue-900">CHW Integration</p>
                <p className="text-sm text-blue-700">
                  Patients with CHW visits show 35% improvement in medication adherence.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'facilities' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Facility Performance Comparison</h3>
            <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Facility</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Region</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Beds</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Readmission Rate</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">High Risk %</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Intervention Rate</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facilityData.map((facility) => (
                  <tr key={facility.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{facility.name}</p>
                      <p className="text-xs text-gray-500">{facility.id}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.region}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.beds}</td>
                    <td className="py-4 px-4">
                      <span className={`text-sm font-bold ${
                        facility.readmissionRate < 9 ? 'text-emerald-600' :
                        facility.readmissionRate > 11 ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        {facility.readmissionRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.highRisk}%</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{facility.intervention}%</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(facility.trend)}
                        <span className={`text-sm ${
                          facility.trend === 'down' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {getTrendText(facility.trend)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" icon={<FileText className="w-4 h-4" />}>
              Generate Report
            </Button>
            <Button variant="ghost" icon={<Download className="w-4 h-4" />}>
              Download CSV
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'model' && (
        <div className="space-y-6">
          {/* Model Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">AUC Score</h3>
                <Activity className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-4xl font-bold text-gray-900">{modelMetrics.auc}</p>
              <p className="text-sm text-emerald-600 mt-2">Target: {'>'}0.80 ✓</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                  style={{ width: `${modelMetrics.auc * 100}%` }}
                />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Sensitivity</h3>
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-4xl font-bold text-gray-900">{(modelMetrics.sensitivity * 100).toFixed(0)}%</p>
              <p className="text-sm text-emerald-600 mt-2">True positive rate</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{ width: `${modelMetrics.sensitivity * 100}%` }}
                />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Specificity</h3>
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-4xl font-bold text-gray-900">{(modelMetrics.specificity * 100).toFixed(0)}%</p>
              <p className="text-sm text-blue-600 mt-2">True negative rate</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${modelMetrics.specificity * 100}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Calibration & Drift */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Model Calibration</h3>
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">{modelMetrics.calibration}</p>
                  <p className="text-sm text-emerald-700">Predicted probabilities align with observed outcomes</p>
                  <p className="text-xs text-emerald-600 mt-1">Last check: 5 days ago</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Drift Status</h3>
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Activity className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">{modelMetrics.driftStatus}</p>
                  <p className="text-sm text-blue-700">No significant data drift detected</p>
                  <p className="text-xs text-blue-600 mt-1">Next check: 2 days</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Model Info */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Model Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Model Version</p>
                <p className="font-semibold text-gray-900">TRIP-v2.3</p>
              </div>
              <div>
                <p className="text-gray-500">Last Trained</p>
                <p className="font-semibold text-gray-900">January 15, 2025</p>
              </div>
              <div>
                <p className="text-gray-500">Training Data</p>
                <p className="font-semibold text-gray-900">45,678 admissions</p>
              </div>
              <div>
                <p className="text-gray-500">Features Used</p>
                <p className="font-semibold text-gray-900">127 variables</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Analytics;
