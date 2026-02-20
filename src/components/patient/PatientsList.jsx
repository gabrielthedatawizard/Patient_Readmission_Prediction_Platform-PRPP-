import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, ChevronRight, 
  User, Calendar, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import RiskScoreDisplay from '../common/RiskScoreDisplay';
import { SAMPLE_PATIENTS } from '../../data/patients';

/**
 * Patients List Component
 * Searchable and filterable patient list with risk indicators
 */

const PatientsList = ({ onPatientSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk'); // risk, name, admission

  // Get unique wards from patients
  const wards = useMemo(() => {
    const wardSet = new Set(SAMPLE_PATIENTS.map(p => p.ward));
    return ['all', ...Array.from(wardSet)];
  }, []);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let filtered = [...SAMPLE_PATIENTS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.mrn.toLowerCase().includes(query) ||
        p.diagnosis.primary.toLowerCase().includes(query)
      );
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(p => p.riskTier.toLowerCase() === riskFilter);
    }

    // Ward filter
    if (wardFilter !== 'all') {
      filtered = filtered.filter(p => p.ward === wardFilter);
    }

    // Sort
    switch (sortBy) {
      case 'risk':
        filtered.sort((a, b) => b.riskScore - a.riskScore);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'admission':
        filtered.sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate));
        break;
      default:
        break;
    }

    return filtered;
  }, [searchQuery, riskFilter, wardFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => ({
    total: SAMPLE_PATIENTS.length,
    high: SAMPLE_PATIENTS.filter(p => p.riskTier === 'High').length,
    medium: SAMPLE_PATIENTS.filter(p => p.riskTier === 'Medium').length,
    low: SAMPLE_PATIENTS.filter(p => p.riskTier === 'Low').length,
    pendingTasks: SAMPLE_PATIENTS.reduce((acc, p) => 
      acc + (p.interventionsNeeded?.filter(i => i.status !== 'completed').length || 0), 0
    )
  }), []);

  const getStatusIcon = (patient) => {
    const pendingCount = patient.interventionsNeeded?.filter(i => i.status !== 'completed').length || 0;
    if (patient.riskTier === 'High' && pendingCount > 0) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (pendingCount === 0) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  const getStatusText = (patient) => {
    const pendingCount = patient.interventionsNeeded?.filter(i => i.status !== 'completed').length || 0;
    if (patient.riskTier === 'High' && pendingCount > 0) {
      return `${pendingCount} tasks pending`;
    }
    if (pendingCount === 0) {
      return 'Ready for discharge';
    }
    return `${pendingCount} tasks pending`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-1">Manage and monitor patient readmission risk</p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
          Export List
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4" hover={false}>
          <p className="text-sm text-gray-500">Total Patients</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-red-50/50" hover={false}>
          <p className="text-sm text-red-600">High Risk</p>
          <p className="text-2xl font-bold text-red-700">{stats.high}</p>
        </Card>
        <Card className="p-4 bg-amber-50/50" hover={false}>
          <p className="text-sm text-amber-600">Medium Risk</p>
          <p className="text-2xl font-bold text-amber-700">{stats.medium}</p>
        </Card>
        <Card className="p-4 bg-emerald-50/50" hover={false}>
          <p className="text-sm text-emerald-600">Low Risk</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.low}</p>
        </Card>
        <Card className="p-4 bg-blue-50/50" hover={false}>
          <p className="text-sm text-blue-600">Pending Tasks</p>
          <p className="text-2xl font-bold text-blue-700">{stats.pendingTasks}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, MRN, or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
            />
          </div>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {/* Ward Filter */}
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="all">All Wards</option>
            {wards.filter(w => w !== 'all').map(ward => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="risk">Sort by Risk</option>
            <option value="name">Sort by Name</option>
            <option value="admission">Sort by Admission Date</option>
          </select>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredPatients.length}</span> of{' '}
          <span className="font-semibold">{SAMPLE_PATIENTS.length}</span> patients
        </p>
        {(searchQuery || riskFilter !== 'all' || wardFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setRiskFilter('all');
              setWardFilter('all');
            }}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {filteredPatients.map((patient) => (
          <Card 
            key={patient.id} 
            className="p-4 hover:border-teal-300 cursor-pointer transition-all"
            onClick={() => onPatientSelect(patient)}
          >
            <div className="flex items-start gap-4">
              {/* Risk Score */}
              <RiskScoreDisplay 
                score={patient.riskScore} 
                tier={patient.riskTier} 
                size="sm"
                showBadge={false}
              />

              {/* Patient Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h3 className="font-bold text-gray-900">{patient.name}</h3>
                  <Badge variant="default">{patient.id}</Badge>
                  <Badge variant={patient.riskTier.toLowerCase()}>
                    {patient.riskTier} Risk
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {patient.age}y · {patient.gender}
                  </span>
                  <span>{patient.ward}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Admitted: {new Date(patient.admissionDate).toLocaleDateString()}
                  </span>
                  <span>LOS: {patient.lengthOfStay} days</span>
                </div>

                <p className="text-sm font-medium text-gray-700 truncate">
                  {patient.diagnosis.primary}
                  {patient.diagnosis.secondary?.length > 0 && (
                    <span className="text-gray-500">
                      {' · '}{patient.diagnosis.secondary.join(', ')}
                  </span>
                  )}
                </p>

                {/* Status Bar */}
                <div className="flex items-center gap-2 mt-3">
                  {getStatusIcon(patient)}
                  <span className="text-sm text-gray-600">{getStatusText(patient)}</span>
                  
                  {/* Intervention badges */}
                  {patient.interventionsNeeded?.slice(0, 3).map((intervention, idx) => (
                    <Badge 
                      key={idx}
                      variant={intervention.priority === 'high' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {intervention.type.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                  {(patient.interventionsNeeded?.length || 0) > 3 && (
                    <Badge variant="default" size="sm">
                      +{patient.interventionsNeeded.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="self-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Card>
        ))}

        {/* Empty State */}
        {filteredPatients.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatientsList;
