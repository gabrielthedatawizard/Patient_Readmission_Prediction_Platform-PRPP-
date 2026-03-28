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
import { useI18n } from "./I18nProvider";
import { canReceiveOperationalNotifications } from "../services/roleAccess";
import {
  useAcknowledgeAlertMutation,
  useAlertsQuery,
  useResolveAlertMutation,
} from "../hooks/useTrip";

const AlertContext = createContext(null);

const initialNotifications = [];

export const AlertProvider = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();
  const { t } = useI18n();
  const canLoadOperationalAlerts = canReceiveOperationalNotifications(userRole);

  const [riskAlerts, setRiskAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [alertActionId, setAlertActionId] = useState(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationPanelRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const alertsQuery = useAlertsQuery(
    { limit: 30 },
    {
      enabled: isAuthenticated && canLoadOperationalAlerts,
      refetchInterval: isAuthenticated && canLoadOperationalAlerts ? 60 * 1000 : false,
    },
  );
  const acknowledgeAlertMutation = useAcknowledgeAlertMutation();
  const resolveAlertMutation = useResolveAlertMutation();

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
    if (!isAuthenticated || !canLoadOperationalAlerts) return;
    await alertsQuery.refetch();
  }, [alertsQuery, canLoadOperationalAlerts, isAuthenticated]);

  const handleAcknowledgeAlert = useCallback(
    async (alertId) => {
      setAlertActionId(`ack:${alertId}`);
      setAlertsError("");
      try {
        const updated = await acknowledgeAlertMutation.mutateAsync(alertId);
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
    [acknowledgeAlertMutation, pushNotification, t, translateTemplate, upsertRiskAlert],
  );

  const handleResolveAlert = useCallback(
    async (alertId) => {
      setAlertActionId(`resolve:${alertId}`);
      setAlertsError("");
      try {
        const updated = await resolveAlertMutation.mutateAsync(alertId);
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
    [pushNotification, resolveAlertMutation, t, translateTemplate],
  );

  useEffect(() => {
    if (!isAuthenticated || !canLoadOperationalAlerts) {
      setRiskAlerts([]);
      setIsAlertsLoading(false);
      setAlertsError("");
      return;
    }

    setIsAlertsLoading(alertsQuery.isLoading || alertsQuery.isFetching);

    if (alertsQuery.error?.status === 403) {
      setRiskAlerts([]);
      setAlertsError("");
      return;
    }

    if (alertsQuery.error) {
      setAlertsError(alertsQuery.error?.message || t("unableToLoadRiskAlerts"));
      return;
    }

    if (alertsQuery.data) {
      setRiskAlerts(
        (alertsQuery.data || [])
          .map((alert) => normalizeAlertRecord(alert))
          .filter((alert) => alert.status !== "resolved"),
      );
      setAlertsError("");
    }
  }, [
    alertsQuery.data,
    alertsQuery.error,
    alertsQuery.isFetching,
    alertsQuery.isLoading,
    canLoadOperationalAlerts,
    isAuthenticated,
    normalizeAlertRecord,
    t,
  ]);

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

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
};

export default AlertContext;
