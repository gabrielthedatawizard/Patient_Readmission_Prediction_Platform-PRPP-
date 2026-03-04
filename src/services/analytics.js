const TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;

export const initAnalytics = () => {
  if (!TRACKING_ID || typeof window === "undefined") {
    return;
  }

  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag("js", new Date());
  window.gtag("config", TRACKING_ID);
};

export const trackPageView = (path) => {
  if (!window.gtag || !TRACKING_ID) {
    return;
  }
  window.gtag("config", TRACKING_ID, { page_path: path });
};

export const trackEvent = (category, action, label) => {
  if (!window.gtag) {
    return;
  }

  window.gtag("event", action, {
    event_category: category,
    event_label: label,
  });
};
