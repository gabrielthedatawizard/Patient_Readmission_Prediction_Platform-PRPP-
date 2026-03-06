import { AlertTriangle, ClipboardCheck, Pill } from "lucide-react";
import { DashboardSkeleton, EmptyState, ErrorState, KPICard, TaskQueue } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { updateTask } from "../services/apiClient";
import { useState } from "react";

export const PharmacistDashboard = ({ pharmacistId }) => {
  const [doneTaskId, setDoneTaskId] = useState(null);
  const { data: tasksResponse, loading, error, refresh } = useDashboardData(
    `/tasks?assignedTo=${encodeURIComponent(pharmacistId || "self")}&include=patient`,
    120000,
  );

  const allTasks = tasksResponse?.tasks || [];
  const medicationTasks = allTasks.filter((task) => String(task.category || "").toLowerCase().includes("med"));
  const highPriorityTasks = medicationTasks.filter((task) => task.priority === "high" && task.status !== "done");
  const pending = medicationTasks.filter((task) => task.status !== "done");

  const handleMarkDone = async (taskId) => {
    setDoneTaskId(taskId);
    try {
      await updateTask(taskId, { status: "completed" });
      await refresh();
    } catch (err) {
      // no-op for dashboard quick completion
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
        <h1 className="text-3xl font-bold text-neutral-900">Pharmacy Dashboard</h1>
        <p className="text-neutral-600 mt-1">Medication reconciliation and discharge prescription safety</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Medication Tasks" value={medicationTasks.length} icon={Pill} />
        <KPICard title="High Priority" value={highPriorityTasks.length} icon={AlertTriangle} />
        <KPICard title="Completed" value={medicationTasks.filter((task) => task.status === "done").length} icon={ClipboardCheck} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Medication Reconciliation Queue</h2>
        {pending.length ? (
          <TaskQueue tasks={pending} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="warning" />
        ) : (
          <EmptyState message="No pending medication tasks." />
        )}
      </div>
    </div>
  );
};

export default PharmacistDashboard;
