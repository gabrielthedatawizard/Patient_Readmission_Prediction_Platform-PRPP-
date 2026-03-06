import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { I18nProvider } from "./context/I18nProvider";
import { ThemeProvider } from "./context/ThemeContext";
import { initAnalytics } from "./services/analytics";
import registerServiceWorker from "./serviceWorkerRegistration";
import "./styles/index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <I18nProvider>
            <App />
          </I18nProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>,
);

registerServiceWorker();
initAnalytics();
