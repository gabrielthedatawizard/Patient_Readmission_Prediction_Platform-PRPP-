import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BellRing, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useAlert } from "../../context/AlertProvider";
import { useI18n } from "../../context/I18nProvider";
import Badge from "../common/Badge";

const NotificationPanel = () => {
  const {
    showNotifications,
    setShowNotifications,
    riskAlerts,
    notifications,
    handleAcknowledgeAlert,
    handleResolveAlert,
    alertActionId,
  } = useAlert();
  const { language } = useI18n();
  const panelRef = useRef(null);

  // Close when pressing Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showNotifications) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showNotifications, setShowNotifications]);

  const allEmpty = riskAlerts.length === 0 && notifications.length === 0;

  return (
    <AnimatePresence>
      {showNotifications && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60"
            onClick={() => setShowNotifications(false)}
          />

          {/* Slide Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl border-l border-slate-200/50 dark:border-slate-800 flex flex-col h-screen"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 rounded-xl">
                  <BellRing className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                    {language === "sw" ? "Arifa" : "Notifications"}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-1 tracking-wider">
                    {riskAlerts.length + notifications.length} {language === "sw" ? "jumla" : "total"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {allEmpty ? (
                <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {language === "sw"
                      ? "Hakuna arifa mpya."
                      : "You're all caught up!"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Risk Alerts Section */}
                  {riskAlerts.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {language === "sw" ? "Arifa za Hatari" : "Actionable Risk Alerts"}
                      </h3>
                      <div className="space-y-3">
                        {riskAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/30 shadow-sm shadow-rose-100/50 dark:shadow-none"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <Badge variant="danger" size="sm" className="mb-1">
                                  {alert.tier || "High"} Priority
                                </Badge>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  Patient {alert.patientId}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400">
                                  {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              Risk score increased to <span className="font-bold text-rose-600">{alert.score}%</span> 
                              {" "}passing the {alert.threshold}% threshold.
                            </p>

                            {/* Alert Channels (SMS/CHW Dispatch) */}
                            {alert.channels && alert.channels.length > 0 && (
                              <div className="mb-4 space-y-1.5">
                                {alert.channels.map((ch, idx) => {
                                  const isSms = ch.type === 'sms' || ch.channel === 'sms';
                                  const status = String(ch.status || 'pending').toLowerCase();
                                  const isSuccess = ['delivered', 'sent', 'submitted'].includes(status);
                                  const isError = ['failed', 'error', 'rejected'].includes(status);
                                  
                                  return (
                                    <div key={idx} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                                      <span className="text-slate-500 flex items-center gap-1">
                                        {isSms && <div className="w-1 h-1 rounded-full bg-teal-400" />}
                                        {ch.label || (isSms ? "CHW SMS Dispatch" : "Alert Channel")}
                                      </span>
                                      <span className={isSuccess ? "text-emerald-500" : isError ? "text-rose-500" : "text-amber-500"}>
                                        {status}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                disabled={alertActionId === `ack:${alert.id}`}
                                className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {alertActionId === `ack:${alert.id}` ? "..." : "Acknowledge"}
                              </button>
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                disabled={alertActionId === `resolve:${alert.id}`}
                                className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                              >
                                {alertActionId === `resolve:${alert.id}` ? "..." : "Mark Resolved"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standard Notifications */}
                  {notifications.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {language === "sw" ? "Arifa za Mfumo" : "Recent Activity"}
                      </h3>
                      <div className="space-y-2">
                        {notifications.map((notif) => {
                          const isSuccess = notif.tone === "emerald";
                          const isWarning = notif.tone === "amber";
                          const isAlert = notif.tone === "rose";
                          
                          let bgClass = "bg-blue-50 dark:bg-blue-900/20";
                          let borderClass = "border-blue-100 dark:border-blue-800/30";
                          let textClass = "text-blue-600 dark:text-blue-400";
                          
                          if (isSuccess) {
                            bgClass = "bg-emerald-50 dark:bg-emerald-900/20";
                            borderClass = "border-emerald-100 dark:border-emerald-800/30";
                            textClass = "text-emerald-600 dark:text-emerald-400";
                          } else if (isWarning) {
                            bgClass = "bg-amber-50 dark:bg-amber-900/20";
                            borderClass = "border-amber-100 dark:border-amber-800/30";
                            textClass = "text-amber-600 dark:text-amber-400";
                          } else if (isAlert) {
                            bgClass = "bg-rose-50 dark:bg-rose-900/20";
                            borderClass = "border-rose-100 dark:border-rose-800/30";
                            textClass = "text-rose-600 dark:text-rose-400";
                          }

                          return (
                            <div
                              key={notif.id}
                              className={`rounded-2xl p-4 border ${bgClass} ${borderClass}`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h4 className={`text-sm font-bold ${textClass}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] font-semibold opacity-60 shrink-0">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {notif.body}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
               <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                 {language === "sw" ? "Mfumo wa Arifa" : "TRIP Alert System"}
               </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
