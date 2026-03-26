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
  mapApiPatientsToUiPatients,
} from "../services/uiMappers";
import {
  getOfflinePatients,
  savePatientsOffline,
} from "../services/offlineStorage";
import {
  useBatchPredictionsQuery,
  usePatientsQuery,
  useTasksQuery,
} from "../hooks/useTrip";

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
  const patientsQuery = usePatientsQuery({}, { enabled: isAuthenticated });
  const tasksQuery = useTasksQuery({}, { enabled: isAuthenticated });
  const patientIds = useMemo(
    () => (patientsQuery.data || []).map((patient) => patient.id),
    [patientsQuery.data],
  );
  const predictionsQuery = useBatchPredictionsQuery(patientIds, {
    enabled: isAuthenticated,
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

  const livePatients = useMemo(
    () =>
      mapApiPatientsToUiPatients(
        patientsQuery.data || [],
        tasksQuery.data || [],
        predictionsQuery.data || {},
      ),
    [patientsQuery.data, predictionsQuery.data, tasksQuery.data],
  );

  const liveDataError =
    patientsQuery.error || tasksQuery.error || predictionsQuery.error;
  const hasLoadedLiveData =
    patientsQuery.isSuccess &&
    tasksQuery.isSuccess &&
    (!patientIds.length || predictionsQuery.isSuccess);

  useEffect(() => {
    if (!isAuthenticated) {
      setPatients([]);
      setSelectedPatient(null);
      setDataError("");
      setIsUsingOfflineData(false);
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(
      (patientsQuery.isLoading || tasksQuery.isLoading || predictionsQuery.isLoading) &&
        !patients.length,
    );
  }, [
    isAuthenticated,
    patients.length,
    patientsQuery.isLoading,
    predictionsQuery.isLoading,
    tasksQuery.isLoading,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !hasLoadedLiveData) {
      return;
    }

    setPatients(livePatients);
    setSelectedPatient((previous) => {
      if (!previous) return null;
      return livePatients.find((patient) => patient.id === previous.id) || null;
    });

    const sourcePatient = patientsQuery.data?.[0] || null;
    if (sourcePatient) {
      const facility = sourcePatient.facility || {};
      setSelectedFacility({
        name: facility.name || livePatients[0]?.facility || "TRIP Facility",
        region: facility.regionCode || currentUser?.regionCode || "Unknown",
        district: facility.district || "Unknown",
      });
    } else if (currentUser?.facilityId) {
      setSelectedFacility((previous) => ({
        ...previous,
        name: currentUser.facilityId,
        region: currentUser.regionCode || previous.region,
      }));
    }

    setIsUsingOfflineData(false);
    setDataError("");
    setIsDataLoading(false);

    savePatientsOffline(livePatients).catch((offlineError) => {
      console.warn("Failed to persist offline snapshot:", offlineError);
    });
  }, [
    currentUser?.facilityId,
    currentUser?.regionCode,
    hasLoadedLiveData,
    isAuthenticated,
    livePatients,
    patientsQuery.data,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !liveDataError || hasLoadedLiveData) {
      return;
    }

    let disposed = false;

    const loadOfflineSnapshot = async () => {
      try {
        const offlinePatients = await getOfflinePatients();
        if (disposed) {
          return;
        }

        if (offlinePatients.length) {
          setPatients(offlinePatients);
          setSelectedPatient((previous) => {
            if (!previous) return null;
            return offlinePatients.find((patient) => patient.id === previous.id) || null;
          });
          setIsUsingOfflineData(true);
          setDataError(
            `Live data unavailable (${liveDataError?.message || "request failed"}). Showing the latest offline snapshot.`,
          );
          setIsDataLoading(false);
          return;
        }
      } catch (offlineError) {
        // Offline cache may not be available
      }

      if (!disposed) {
        setPatients([]);
        setIsUsingOfflineData(false);
        setDataError(liveDataError?.message || "Unable to load operational data.");
        setIsDataLoading(false);
      }
    };

    loadOfflineSnapshot();

    return () => {
      disposed = true;
    };
  }, [hasLoadedLiveData, isAuthenticated, liveDataError]);

  const loadPatients = useCallback(async () => {
    await Promise.all([
      patientsQuery.refetch(),
      tasksQuery.refetch(),
      patientIds.length ? predictionsQuery.refetch() : Promise.resolve(),
    ]);
    return patients;
  }, [patientIds.length, patients, patientsQuery, predictionsQuery, tasksQuery]);

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

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within PatientProvider");
  }
  return context;
};

export default PatientContext;
