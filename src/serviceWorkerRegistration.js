export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Service worker registration failed:", error);
    }
  });
};

export default registerServiceWorker;
