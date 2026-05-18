import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthProvider';
import { useAlert } from '../context/AlertProvider';
import { getWebSocketBaseUrl, isWebSocketEnabled } from '../services/runtimeConfig';

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const MAX_RETRIES = 12;

export function useWebSocket() {
  const { isAuthenticated, currentUser } = useAuth();
  const { pushNotification, upsertRiskAlert } = useAlert();
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const unmountedRef = useRef(false);
  const isConnectingRef = useRef(false);

  const handleMessage = useCallback(
    (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      const { type, payload = {} } = msg;

      if (type === 'READMISSION_ALERT') {
        const tier = payload.tier || 'High';
        const patientName = payload.patientName || payload.patientId || 'Patient';
        const score = payload.score != null ? payload.score : '';
        const topFactors = Array.isArray(payload.topFactors) ? payload.topFactors : [];

        pushNotification({
          tone: tier === 'VeryHigh' ? 'red' : 'amber',
          title: `Readmission Alert — ${tier} Risk`,
          body: `${patientName} scored ${score}. ${topFactors.length ? 'Top factors: ' + topFactors.slice(0, 2).join(', ') + '.' : 'Immediate review needed.'}`,
          titleKey: 'realtimeAlertTitle',
          bodyKey: 'realtimeAlertBody',
        });

        upsertRiskAlert({
          id: `ws-${payload.patientId}-${Date.now()}`,
          patientId: payload.patientId,
          patientName,
          score: Number(payload.score || 0),
          probability: payload.probability,
          tier,
          threshold: tier === 'VeryHigh' ? 85 : 60,
          status: 'open',
          topFactors,
          channels: ['websocket'],
          createdAt: new Date().toISOString(),
          source: 'realtime',
        });
      }

      if (type === 'TASK_ASSIGNED') {
        pushNotification({
          tone: 'blue',
          title: 'Task Assigned',
          body: payload.title || 'A new task has been assigned to you.',
          titleKey: 'taskAssigned',
          bodyKey: 'taskAssignedBody',
        });
      }

      if (type === 'SYNC_COMPLETE') {
        pushNotification({
          tone: 'emerald',
          title: 'Sync Complete',
          body: 'Offline changes have been synced successfully.',
          titleKey: 'changesSynced',
          bodyKey: 'changesSyncedBody',
        });
      }
    },
    [pushNotification, upsertRiskAlert],
  );

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    if (!isAuthenticated) return;
    if (!isWebSocketEnabled()) return;
    if (isConnectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    isConnectingRef.current = true;

    try {
      const baseUrl = getWebSocketBaseUrl();
      const wsUrl = `${baseUrl}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        retriesRef.current = 0;

        // Send identity frame so server can associate this socket with facilityId
        if (currentUser?.facilityId) {
          ws.send(JSON.stringify({ type: 'IDENTIFY', facilityId: currentUser.facilityId }));
        }
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        isConnectingRef.current = false;
        wsRef.current = null;
        if (unmountedRef.current) return;
        if (retriesRef.current >= MAX_RETRIES) return;
        const delay = Math.min(BASE_DELAY_MS * 2 ** retriesRef.current, MAX_DELAY_MS);
        retriesRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        ws.close();
      };
    } catch {
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, currentUser?.facilityId, handleMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    retriesRef.current = 0;
    connect();

    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
