import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import {
  fetchAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "../services/apiClient";
import { useI18n } from "./I18nProvider";

const AlertContext = createContext(null);

const initialNotifications = [
  {
    id: "seed-1",
    tone: "red",
    titleKey: "notificationHighRiskPatient",
    bodyKey: "notificationHighRiskPatientBody",
  },
  {
    id: "seed-2",
    tone: "amber",
    titleKey: "notificationFollowupDue",
    bodyKey: "notificationFollowupDueBody",
  },
  {
    id: "seed-3",
    tone: "emerald",
    titleKey: "notificationDataQualityImproved",
    bodyKey: "notificationDataQualityImprovedBody",
  },
];

export const AlertProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { t, language } = useI18n();

  const [riskAlerts, setRiskAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [alertActionId, setAlertActionId] = useState(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationPanelRef = useRef(null);
  const notificationButtonRef = useRef(null);

  const fillTemplate = useCallback((template, values = {}) => {
    return Object.entries(values).reduce(
      (result, [key, value]) =>
        result.split(`{${key}}`).join(String(value ?? "")),
      template,
    );
  }, []);

  const translateTemplate = useCallback(
    (key, values = {}, fallback = key) => fillTemplate(t(key, fallback), values),
    [fillTemplate, t],
  );

  const pushNotification = useCallback((notification) => {
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tone: notification.tone || "blue",
      title: notification.title || "",
      body: notification.body || "",
      createdAt: notification.createdAt || new Date().toISOString(),
      titleKey: notification.titleKey,
      bodyKey: notification.bodyKey,
    };
    setNotifications((prev) => [record, ...prev].slice(0, 25));
  }, []);

  const normalizeAlertRecord = useCallback((alert = {}) => {
    const createdAt =
      alert.createdAt || alert.generatedAt || new Date().toISOString();
    return {
      ...alert,
      id: alert.id || `alert-${alert.predictionId || Date.now()}`,
      patientId: alert.patientId || "Unknown",
      score: Number(alert.score || 0),
      threshold: Number(alert.threshold || 80),
      tier: alert.tier || "High",
      status: alert.status || "open",
      createdAt,
      channels: Array.isArray(alert.channels) ? alert.channels : [],
    };
  }, []);

  const upsertRiskAlert = useCallback(
    (incomingAlert) => {
      const normalized = normalizeAlertRecord(incomingAlert);
      if (normalized.status === "resolved") {
        setRiskAlerts((prev) => prev.filter((a) => a.id !== normalized.id));
        return;
      }
      setRiskAlerts((prev) => {
        const merged = [
          normalized,
          ...prev.filter((a) => a.id !== normalized.id),
        ];
        return merged
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 50);
      });
    },
    [normalizeAlertRecord],
  );

  const loadRiskAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsAlertsLoading(true);
    setAlertsError("");
    try {
      const alerts = await fetchAlerts({ limit: 30 });
      setRiskAlerts(
        (alerts || [])
          .map((a) => normalizeAlertRecord(a))
          .filter((a) => a.status !== "resolved"),
      );
    } catch (error) {
      if (error?.status === 403) {
        setRiskAlerts([]);
        setAlertsError("");
        return;
      }
      setAlertsError(error?.message || t("unableToLoadRiskAlerts"));
    } finally {
      setIsAlertsLoading(false);
    }
  }, [isAuthenticated, normalizeAlertRecord, t]);

  const handleAcknowledgeAlert = useCallback(
    async (alertId) => {
      setAlertActionId(`ack:${alertId}`);
      setAlertsError("");
      try {
        const updated = await acknowledgeAlert(alertId);
        if (updated) upsertRiskAlert(updated);
        pushNotification({
          tone: "blue",
          title: t("riskAlertAcknowledged"),
          body: translateTemplate("alertAcknowledgedBody", { id: alertId }),
        });
      } catch (error) {
        setAlertsError(error?.message || t("unableToAcknowledgeAlert"));
      } finally {
        setAlertActionId(null);
      }
    },
    [pushNotification, t, translateTemplate, upsertRiskAlert],
  );

  const handleResolveAlert = useCallback(
    async (alertId) => {
      setAlertActionId(`resolve:${alertId}`);
      setAlertsError("");
      try {
        const updated = await resolveAlert(alertId);
        if (updated?.id) {
          setRiskAlerts((prev) => prev.filter((a) => a.id !== updated.id));
        }
        pushNotification({
          tone: "emerald",
          title: t("riskAlertResolved"),
          body: translateTemplate("alertResolvedBody", { id: alertId }),
        });
      } catch (error) {
        setAlertsError(error?.message || t("unableToResolveAlert"));
      } finally {
        setAlertActionId(null);
      }
    },
    [pushNotification, t, translateTemplate],
  );

  // Load alerts when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setRiskAlerts([]);
      return;
    }
    loadRiskAlerts();
  }, [isAuthenticated, loadRiskAlerts]);

  // Reload alerts when notification panel opens
  useEffect(() => {
    if (!isAuthenticated || !showNotifications) return;
    loadRiskAlerts();
  }, [isAuthenticated, showNotifications, loadRiskAlerts]);

  // Close notification panel on click outside or Escape key
  useEffect(() => {
    if (!showNotifications) return undefined;

    const handlePointerDown = (event) => {
      const panel = notificationPanelRef.current;
      const toggleButton = notificationButtonRef.current;
      const target = event.target;
      if (panel?.contains(target) || toggleButton?.contains(target)) return;
      setShowNotifications(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowNotifications(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showNotifications]);

  const value = useMemo(
    () => ({
      riskAlerts,
      isAlertsLoading,
      alertsError,
      alertActionId,
      notifications,
      showNotifications,
      setShowNotifications,
      notificationPanelRef,
      notificationButtonRef,
      pushNotification,
      loadRiskAlerts,
      handleAcknowledgeAlert,
      handleResolveAlert,
      upsertRiskAlert,
      translateTemplate,
      normalizeAlertRecord,
    }),
    [
      riskAlerts,
      isAlertsLoading,
      alertsError,
      alertActionId,
      notifications,
      showNotifications,
      pushNotification,
      loadRiskAlerts,
      handleAcknowledgeAlert,
      handleResolveAlert,
      upsertRiskAlert,
      translateTemplate,
      normalizeAlertRecord,
    ],
  );

  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlerts must be used within AlertProvider");
  }
  return context;
};

export default AlertContext;
