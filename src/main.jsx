import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { I18nProvider } from "./context/I18nProvider";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthProvider";
import { PatientProvider } from "./context/PatientProvider";
import { TaskProvider } from "./context/TaskProvider";
import { AlertProvider } from "./context/AlertProvider";
import { initAnalytics } from "./services/analytics";
import registerServiceWorker from "./serviceWorkerRegistration";
import "./styles/index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <PatientProvider>
                  <TaskProvider>
                    <AlertProvider>
                      <App />
                    </AlertProvider>
                  </TaskProvider>
                </PatientProvider>
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>,
);

registerServiceWorker();
initAnalytics();
