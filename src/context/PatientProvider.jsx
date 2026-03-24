import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import {
  fetchPatients,
  fetchLatestPrediction,
  fetchBatchPredictions,
} from "../services/apiClient";
import {
  mapApiPatientsToUiPatients,
} from "../services/uiMappers";
import {
  getOfflinePatients,
  savePatientsOffline,
} from "../services/offlineStorage";

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [isUsingOfflineData, setIsUsingOfflineData] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState({
    name: "TRIP Facility",
    region: "Unknown",
    district: "Unknown",
  });

  const toUiRiskFactors = useCallback((factors = []) => {
    if (!Array.isArray(factors) || factors.length === 0) {
      return null;
    }
    return factors.map((factor) => ({
      factor: factor.factor || factor.label || "Unknown factor",
      weight: Number(factor.weight || factor.value || 0),
      category: factor.category || "clinical",
    }));
  }, []);

  const loadPatients = useCallback(async (tasks = []) => {
    setIsDataLoading(true);
    setDataError("");

    try {
      const apiPatients = await fetchPatients();
      const patientIds = apiPatients.map(p => p.id);

      const predictionByPatientId = await fetchBatchPredictions(patientIds);
      const mappedPatients = mapApiPatientsToUiPatients(
        apiPatients,
        tasks,
        predictionByPatientId,
      );

      setPatients(mappedPatients);
      setSelectedPatient((previous) => {
        if (!previous) return null;
        return mappedPatients.find((p) => p.id === previous.id) || null;
      });

      if (apiPatients.length > 0) {
        const facility = apiPatients[0]?.facility || {};
        setSelectedFacility({
          name: facility.name || mappedPatients[0]?.facility || "TRIP Facility",
          region: facility.regionCode || currentUser?.regionCode || "Unknown",
          district: facility.district || "Unknown",
        });
      } else if (currentUser?.facilityId) {
        setSelectedFacility((prev) => ({
          ...prev,
          name: currentUser.facilityId,
          region: currentUser.regionCode || prev.region,
        }));
      }

      setIsUsingOfflineData(false);
      try {
        await savePatientsOffline(mappedPatients);
      } catch (offlineError) {
        console.warn("Failed to persist offline snapshot:", offlineError);
      }

      return mappedPatients;
    } catch (error) {
      try {
        const offlinePatients = await getOfflinePatients();
        if (offlinePatients.length) {
          setPatients(offlinePatients);
          setSelectedPatient((previous) => {
            if (!previous) return null;
            return offlinePatients.find((p) => p.id === previous.id) || null;
          });
          setIsUsingOfflineData(true);
          setDataError(
            `Live data unavailable (${error?.message || "request failed"}). Showing the latest offline snapshot.`,
          );
          return offlinePatients;
        }
      } catch (offlineError) {
        // Offline cache may not be available
      }

      setDataError(error?.message || "Unable to load operational data.");
      setPatients([]);
      setIsUsingOfflineData(false);
      return [];
    } finally {
      setIsDataLoading(false);
    }
  }, [currentUser]);

  const updatePatientPrediction = useCallback(
    (patientId, prediction) => {
      if (!patientId) return;

      const mappedFactors = toUiRiskFactors(prediction.factors);
      const nextScore = Number.isFinite(Number(prediction.score))
        ? Number(prediction.score)
        : null;
      const nextConfidence = Number.isFinite(Number(prediction.confidence))
        ? Number(prediction.confidence)
        : null;

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                riskTier: prediction.tier || patient.riskTier,
                riskScore: nextScore ?? patient.riskScore,
                riskConfidence: nextConfidence ?? patient.riskConfidence,
                riskFactors: mappedFactors || patient.riskFactors,
              }
            : patient,
        ),
      );

      setSelectedPatient((prev) =>
        prev && prev.id === patientId
          ? {
              ...prev,
              riskTier: prediction.tier || prev.riskTier,
              riskScore: nextScore ?? prev.riskScore,
              riskConfidence: nextConfidence ?? prev.riskConfidence,
              riskFactors: mappedFactors || prev.riskFactors,
            }
          : prev,
      );
    },
    [toUiRiskFactors],
  );

  const dashboardStats = useMemo(() => {
    const totalPatients = patients.length;
    const highRiskCount = patients.filter(
      (p) => String(p.riskTier).toLowerCase() === "high",
    ).length;
    const mediumRiskCount = patients.filter(
      (p) => String(p.riskTier).toLowerCase() === "medium",
    ).length;
    const lowRiskCount = patients.filter(
      (p) => String(p.riskTier).toLowerCase() === "low",
    ).length;

    return {
      totalPatients,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };
  }, [patients]);

  const value = useMemo(
    () => ({
      patients,
      setPatients,
      selectedPatient,
      setSelectedPatient,
      isDataLoading,
      dataError,
      isUsingOfflineData,
      selectedFacility,
      setSelectedFacility,
      loadPatients,
      updatePatientPrediction,
      dashboardStats,
    }),
    [
      patients,
      selectedPatient,
      isDataLoading,
      dataError,
      isUsingOfflineData,
      selectedFacility,
      loadPatients,
      updatePatientPrediction,
      dashboardStats,
    ],
  );

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatients must be used within PatientProvider");
  }
  return context;
};

export default PatientContext;
