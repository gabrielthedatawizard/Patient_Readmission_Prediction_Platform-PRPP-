import { getWebSocketBaseUrl, isWebSocketEnabled } from "./runtimeConfig";

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.disabled = !isWebSocketEnabled();
  }

  connect({ userId, token }) {
    if (!userId || this.disabled) {
      return;
    }

    const baseUrl = getWebSocketBaseUrl();
    const params = new URLSearchParams();
    params.set("userId", userId);
    if (token) {
      params.set("token", token);
    }

    const url = `${baseUrl}?${params.toString()}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handlers = this.listeners.get(data.type) || [];
        handlers.forEach((handler) => handler(data.payload));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("WebSocket message parse error:", error);
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect({ userId, token });
    };

    this.ws.onerror = (error) => {
      // eslint-disable-next-line no-console
      console.error("WebSocket error:", error);
    };
  }

  scheduleReconnect(params) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => this.connect(params), 3000);
  }

  disconnect() {
    if (this.disabled) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(handler);

    return () => {
      const handlers = this.listeners.get(eventType) || [];
      this.listeners.set(
        eventType,
        handlers.filter((entry) => entry !== handler),
      );
    };
  }

  send(type, payload) {
    if (this.disabled) {
      return;
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
