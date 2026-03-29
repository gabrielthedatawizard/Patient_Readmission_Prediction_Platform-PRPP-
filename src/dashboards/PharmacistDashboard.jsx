import { AlertTriangle, ClipboardCheck, Pill } from "lucide-react";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  KPICard,
  TaskQueue,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { updateTask } from "../services/apiClient";
import { useState } from "react";
import { useI18n } from "../context/I18nProvider";

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

  if (loading && !tasksResponse) {
    return <DashboardSkeleton cards={3} />;
  }

  if (error && !tasksResponse) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">
          {language === "sw" ? "Dashibodi ya famasia" : "Pharmacy dashboard"}
        </h1>
        <p className="mt-1 text-neutral-600">
          {language === "sw"
            ? "Usalama wa dawa, upatanishaji, na maagizo ya kuondoka."
            : "Medication reconciliation and discharge prescription safety."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard
          title={language === "sw" ? "Kazi za dawa" : "Medication tasks"}
          value={medicationTasks.length}
          icon={Pill}
        />
        <KPICard
          title={language === "sw" ? "Kipaumbele cha juu" : "High priority"}
          value={highPriorityTasks.length}
          icon={AlertTriangle}
        />
        <KPICard
          title={language === "sw" ? "Zimekamilika" : "Completed"}
          value={medicationTasks.filter((task) => task.status === "done" || task.status === "completed").length}
          icon={ClipboardCheck}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-neutral-900">
          {language === "sw" ? "Foleni ya upatanishaji wa dawa" : "Medication reconciliation queue"}
        </h2>
        {taskFeedback ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {taskFeedback}
          </div>
        ) : null}
        {taskError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {taskError}
          </div>
        ) : null}
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
      </div>
    </div>
  );
};

export default PharmacistDashboard;
