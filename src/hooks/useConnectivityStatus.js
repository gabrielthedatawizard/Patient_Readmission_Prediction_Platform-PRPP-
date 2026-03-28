import { useEffect, useState } from "react";

function getInitialConnectivity() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

export function useConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(getInitialConnectivity);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);

    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);

    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  return isOnline;
}

export default useConnectivityStatus;
