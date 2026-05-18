import { useCallback, useEffect, useRef, useState } from "react";

const PING_URL = "/manifest.json";
const PING_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = 15_000; // check every 15 s — fast enough to catch reconnection

async function pingNetwork() {
  if (typeof navigator === "undefined" || typeof fetch === "undefined") return true;

  // navigator.onLine=false is definitive — don't even bother pinging
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    // Cache-bust so the service worker can't intercept this from the static cache
    const resp = await fetch(`${PING_URL}?_ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

export function useConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });
  const pollRef = useRef(null);

  const verify = useCallback(async () => {
    const online = await pingNetwork();
    setIsOnline(online);
    return online;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // Sync immediately with actual network state
    verify();

    const markOnline = () => {
      // navigator.onLine just flipped to true — verify with a real ping
      verify();
    };
    const markOffline = () => {
      // navigator.onLine=false is authoritative — go offline immediately
      setIsOnline(false);
    };

    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);

    // Poll periodically so we catch captive portals and silent disconnections
    pollRef.current = setInterval(verify, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
      clearInterval(pollRef.current);
    };
  }, [verify]);

  return isOnline;
}

export default useConnectivityStatus;
