export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { updateViaCache: "none" }, // always re-fetch the SW script, never serve from HTTP cache
      );

      // When a new SW is waiting (update found), activate it immediately
      // instead of waiting for all tabs to close
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Tell the new SW to skip waiting and take control now
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // When the SW takes control, reload to use fresh cached assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
};

export default registerServiceWorker;
