import React, { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep console logging for local debugging and send to Sentry if present.
    // eslint-disable-next-line no-console
    console.error("Error caught by boundary:", error, info);
    if (window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: info });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl p-8 text-center ring-1 ring-red-100 dark:ring-red-900/40">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Samahani (Sorry)</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Something went wrong loading this module. The issue has been securely logged.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
