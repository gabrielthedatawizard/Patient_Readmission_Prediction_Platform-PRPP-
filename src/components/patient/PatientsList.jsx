import React, { useMemo, useState } from "react";
import {
  Search,
  Download,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import Button from "../common/Button";
import RiskScoreDisplay from "../common/RiskScoreDisplay";

/**
 * Patients List Component
 * Searchable and filterable patient list with risk indicators
 */

const PatientsList = ({ onPatientSelect, patients = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [sortBy, setSortBy] = useState("risk"); // risk, name, admission

  const wards = useMemo(() => {
    const wardSet = new Set(
      patients
        .map((patient) => patient.ward)
        .filter((value) => value && String(value).trim().length > 0),
    );
    return ["all", ...Array.from(wardSet)];
  }, [patients]);

  const filteredPatients = useMemo(() => {
    let filtered = [...patients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((patient) => {
        return (
          String(patient.name || "")
            .toLowerCase()
            .includes(query) ||
          String(patient.id || "")
            .toLowerCase()
            .includes(query) ||
          String(patient.mrn || "")
            .toLowerCase()
            .includes(query) ||
          String(patient.diagnosis?.primary || "")
            .toLowerCase()
            .includes(query)
        );
      });
    }

    if (riskFilter !== "all") {
      filtered = filtered.filter(
        (patient) => String(patient.riskTier || "").toLowerCase() === riskFilter,
      );
    }

    if (wardFilter !== "all") {
      filtered = filtered.filter((patient) => patient.ward === wardFilter);
    }

    switch (sortBy) {
      case "risk":
        filtered.sort(
          (first, second) =>
            Number(second.riskScore || 0) - Number(first.riskScore || 0),
        );
        break;
      case "name":
        filtered.sort((first, second) =>
          String(first.name || "").localeCompare(String(second.name || "")),
        );
        break;
      case "admission":
        filtered.sort(
          (first, second) =>
            new Date(second.admissionDate || 0) - new Date(first.admissionDate || 0),
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [patients, searchQuery, riskFilter, wardFilter, sortBy]);

  const stats = useMemo(
    () => ({
      total: patients.length,
      high: patients.filter((patient) => patient.riskTier === "High").length,
      medium: patients.filter((patient) => patient.riskTier === "Medium").length,
      low: patients.filter((patient) => patient.riskTier === "Low").length,
      pendingTasks: patients.reduce(
        (accumulator, patient) =>
          accumulator +
          ((patient.interventionsNeeded || []).filter(
            (intervention) => intervention.status !== "completed",
          ).length || 0),
        0,
      ),
    }),
    [patients],
  );

  const getStatusIcon = (patient) => {
    const pendingCount =
      patient.interventionsNeeded?.filter(
        (intervention) => intervention.status !== "completed",
      ).length || 0;
    if (patient.riskTier === "High" && pendingCount > 0) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (pendingCount === 0) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  const getStatusText = (patient) => {
    const pendingCount =
      patient.interventionsNeeded?.filter(
        (intervention) => intervention.status !== "completed",
      ).length || 0;
    if (patient.riskTier === "High" && pendingCount > 0) {
      return `${pendingCount} tasks pending`;
    }
    if (pendingCount === 0) {
      return "Ready for discharge";
    }
    return `${pendingCount} tasks pending`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor patient readmission risk
          </p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
          Export List
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, MRN, or diagnosis..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
            className="w-full lg:w-auto px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={wardFilter}
            onChange={(event) => setWardFilter(event.target.value)}
            className="w-full lg:w-auto px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="all">All Wards</option>
            {wards
              .filter((ward) => ward !== "all")
              .map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full lg:w-auto px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
          >
            <option value="risk">Sort by Risk</option>
            <option value="name">Sort by Name</option>
            <option value="admission">Sort by Admission Date</option>
          </select>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredPatients.length}</span>{" "}
          of <span className="font-semibold">{patients.length}</span> patients
        </p>
        {(searchQuery || riskFilter !== "all" || wardFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setRiskFilter("all");
              setWardFilter("all");
            }}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredPatients.map((patient) => (
          <Card
            key={patient.id}
            className="p-4 hover:border-teal-300 cursor-pointer transition-all"
            onClick={() => onPatientSelect(patient)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <RiskScoreDisplay
                score={patient.riskScore}
                tier={patient.riskTier}
                size="sm"
                showBadge={false}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h3 className="font-bold text-gray-900">{patient.name}</h3>
                  <Badge variant="default">{patient.id}</Badge>
                  <Badge variant={String(patient.riskTier).toLowerCase()}>
                    {patient.riskTier} Risk
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {patient.age}y · {patient.gender}
                  </span>
                  <span>{patient.ward || "Ward not assigned"}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Admitted:{" "}
                    {patient.admissionDate
                      ? new Date(patient.admissionDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                  <span>LOS: {patient.lengthOfStay || 0} days</span>
                </div>

                <p className="text-sm font-medium text-gray-700 break-words">
                  {patient.diagnosis?.primary || "Diagnosis pending"}
                  {patient.diagnosis?.secondary?.length > 0 && (
                    <span className="text-gray-500">
                      {" · "}
                      {patient.diagnosis.secondary.join(", ")}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(patient)}
                  <span className="text-xs font-medium text-gray-600">
                    {getStatusText(patient)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredPatients.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-sm text-gray-600">
              No patients match your current filters.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatientsList;
