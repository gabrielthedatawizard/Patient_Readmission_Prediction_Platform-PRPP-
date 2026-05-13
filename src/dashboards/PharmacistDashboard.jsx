import { AlertTriangle, ClipboardCheck, Pill } from "lucide-react";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  KPICard,
  TaskQueue,
  DashboardLayout,
  DashboardSection,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { updateTask } from "../services/apiClient";
import { useState } from "react";
import { useI18n } from "../context/I18nProvider";

// Persona: Pharmacist
// JTBD: "Are there any medication risks before this patient goes home?"
// Mental model: Safety checker. Zero-miss tolerance.

export const PharmacistDashboard = ({ pharmacistId }) => {
  const { language } = useI18n();
  const [doneTaskId, setDoneTaskId] = useState(null);
  const [taskFeedback, setTaskFeedback] = useState("");
  const [taskError, setTaskError] = useState("");

  const { data: tasksResponse, loading, error, refresh } = useDashboardData(
    `/tasks?assignedTo=${encodeURIComponent(pharmacistId || "self")}&include=patient`,
    120000,
  );

  const allTasks = tasksResponse?.tasks || [];
  const medicationTasks = allTasks.filter((task) =>
    String(task.category || "").toLowerCase().includes("med"),
  );
  const highPriorityTasks = medicationTasks.filter(
    (task) => task.priority === "high" && task.status !== "done" && task.status !== "completed",
  );
  const pending = medicationTasks.filter(
    (task) => task.status !== "done" && task.status !== "completed",
  );
  const completed = medicationTasks.filter(
    (task) => task.status === "done" || task.status === "completed",
  );

  const handleMarkDone = async (taskId) => {
    setTaskFeedback("");
    setTaskError("");
    setDoneTaskId(taskId);
    try {
      await updateTask(taskId, { status: "completed" });
      await refresh();
      setTaskFeedback(
        language === "sw"
          ? "Kazi ya dawa imekamilishwa."
          : "Medication task completed successfully.",
      );
    } catch (err) {
      setTaskError(
        err?.message ||
          (language === "sw"
            ? "Imeshindikana kukamilisha kazi ya dawa kutoka dashibodini."
            : "Unable to complete the medication task from the dashboard."),
      );
    } finally {
      setDoneTaskId(null);
    }
  };

  if (loading && !tasksResponse) return <DashboardSkeleton cards={3} />;
  if (error && !tasksResponse) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <DashboardLayout
      title={language === "sw" ? "Dashibodi ya famasia" : "Pharmacy Dashboard"}
      subtitle={
        language === "sw"
          ? "Usalama wa dawa, upatanishaji, na maagizo ya kuondoka."
          : "Medication reconciliation and discharge prescription safety."
      }
      kpis={[
        <KPICard
          key="total"
          title={language === "sw" ? "Kazi za dawa" : "Medication tasks"}
          value={medicationTasks.length}
          icon={Pill}
          footer={language === "sw" ? "Jumla ya kazi za dawa" : "Total medication tasks"}
          variant="default"
        />,
        <KPICard
          key="high"
          title={language === "sw" ? "Kipaumbele cha juu" : "High priority"}
          value={highPriorityTasks.length}
          icon={AlertTriangle}
          footer={
            highPriorityTasks.length > 0
              ? language === "sw" ? "Zinahitaji uangalizi wa haraka" : "Requires immediate attention"
              : language === "sw" ? "Hakuna za kipaumbele cha juu" : "None pending"
          }
          variant={highPriorityTasks.length > 0 ? "danger" : "success"}
        />,
        <KPICard
          key="done"
          title={language === "sw" ? "Zimekamilika" : "Completed"}
          value={completed.length}
          icon={ClipboardCheck}
          footer={
            medicationTasks.length
              ? `${Math.round((completed.length / medicationTasks.length) * 100)}% ${language === "sw" ? "ya jumla" : "of total"}`
              : language === "sw" ? "Hakuna kazi" : "No tasks yet"
          }
          variant="success"
        />,
      ]}
    >
      <DashboardSection
        title={language === "sw" ? "Foleni ya upatanishaji wa dawa" : "Medication reconciliation queue"}
        subtitle={pending.length ? `${pending.length} ${language === "sw" ? "zinazosubiri" : "pending"}` : undefined}
      >
        {taskFeedback && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
            {taskFeedback}
          </div>
        )}
        {taskError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
            {taskError}
          </div>
        )}
        {pending.length ? (
          <TaskQueue tasks={pending} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="warning" />
        ) : (
          <EmptyState
            message={
              language === "sw"
                ? "Hakuna kazi za dawa zinazosubiri katika kituo au ward iliyo ndani ya scope yako."
                : "No pending medication tasks are currently in your facility or ward scope."
            }
          />
        )}
      </DashboardSection>
    </DashboardLayout>
  );
};

export default PharmacistDashboard;
