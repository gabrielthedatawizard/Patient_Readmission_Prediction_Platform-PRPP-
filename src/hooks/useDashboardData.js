import { useCallback, useEffect, useState } from "react";
import { getStoredToken } from "../services/apiClient";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

function buildUrl(endpoint) {
  if (!endpoint) {
    return API_BASE;
  }

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  if (endpoint.startsWith("/")) {
    return `${API_BASE}${endpoint}`;
  }

  return `${API_BASE}/${endpoint}`;
}

export function useDashboardData(endpoint, refreshInterval = 300000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const token = getStoredToken();
      const response = await fetch(buildUrl(endpoint), {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();

    if (!refreshInterval || refreshInterval <= 0) {
      return undefined;
    }

    const interval = window.setInterval(fetchData, refreshInterval);
    return () => window.clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    lastRefresh,
    refresh: fetchData,
  };
}

export default useDashboardData;
