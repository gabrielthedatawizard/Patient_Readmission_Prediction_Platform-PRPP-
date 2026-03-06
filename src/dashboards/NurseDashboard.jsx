import { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import { DashboardSkeleton, DischargeChecklist, EmptyState, ErrorState, KPICard, TaskQueue } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { updateTask } from "../services/apiClient";

function toArray(input) {
  return Array.isArray(input) ? input : [];
}

function calculateAvgTime(tasks = []) {
  if (!tasks.length) {
    return 0;
  }

  const totalMinutes = tasks.reduce((sum, task) => {
    const created = new Date(task.createdAt || Date.now()).getTime();
    const completed = new Date(task.completedAt || Date.now()).getTime();
    return sum + Math.max(Math.round((completed - created) / 60000), 0);
  }, 0);

  return Math.round(totalMinutes / tasks.length);
}

export const NurseDashboard = ({ nurseId }) => {
  const [doneTaskId, setDoneTaskId] = useState(null);

  const { data: tasksResponse, loading, error, refresh } = useDashboardData(
    `/tasks?assignedTo=${encodeURIComponent(nurseId || "self")}&include=patient`,
    90000,
  );
  const { data: patientsResponse } = useDashboardData(
    `/patients?assignedTo=${encodeURIComponent(nurseId || "self")}&include=tasks,predictions`,
    90000,
  );

  const myTasks = toArray(tasksResponse?.tasks).filter((task) => task.status !== "done");
  const completedToday = toArray(tasksResponse?.tasks).filter((task) => {
    if (task.status !== "done" || !task.completedAt) {
      return false;
    }
    const done = new Date(task.completedAt);
    const today = new Date();
    return done.toDateString() === today.toDateString();
  });

  const todayDischarges = useMemo(() => {
    return toArray(patientsResponse?.patients).filter((patient) => {
      const predictionScore = Number(patient.latestPrediction?.score || patient.riskScore || 0);
      return predictionScore < 40;
    });
  }, [patientsResponse?.patients]);

  const overdueTasks = myTasks.filter((task) => new Date(task.dueDate || Date.now()) < new Date());
  const todayTasks = myTasks.filter((task) => {
    const due = new Date(task.dueDate || Date.now());
    return due.toDateString() === new Date().toDateString();
  });
  const upcomingTasks = myTasks.filter((task) => {
    const due = new Date(task.dueDate || Date.now());
    return due > new Date();
  });

  const handleMarkDone = async (taskId) => {
    setDoneTaskId(taskId);
    try {
      await updateTask(taskId, { status: "completed" });
      await refresh();
    } catch (err) {
      // no-op for dashboard quick action
    } finally {
      setDoneTaskId(null);
    }
  };

  const handleStepComplete = () => {
    // Placeholder for checklist API mutation.
  };

  if (loading && !tasksResponse) {
    return <DashboardSkeleton cards={4} />;
  }

  if (error && !tasksResponse) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">My Tasks</h1>
        <p className="text-neutral-600 mt-1">Discharge coordination and patient care tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Tasks Due Today" value={todayTasks.length} icon={Calendar} footer="Must complete by end of day" />
        <KPICard
          title="Overdue"
          value={overdueTasks.length}
          icon={AlertCircle}
          footer={overdueTasks.length > 0 ? "Needs immediate attention" : "No overdue tasks"}
          className={overdueTasks.length > 0 ? "border-red-300 bg-red-50" : ""}
        />
        <KPICard
          title="Completed Today"
          value={completedToday.length}
          icon={CheckCircle}
          footer={`Avg time: ${calculateAvgTime(completedToday)} min`}
        />
        <KPICard title="Upcoming" value={upcomingTasks.length} icon={Clock} footer="Next 7 days" />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Task Queue - Prioritized</h2>

        {overdueTasks.length ? (
          <div className="mb-6">
            <h3 className="text-red-700 font-semibold mb-3">Overdue ({overdueTasks.length})</h3>
            <TaskQueue tasks={overdueTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="danger" />
          </div>
        ) : null}

        <div className="mb-6">
          <h3 className="text-amber-700 font-semibold mb-3">Due Today ({todayTasks.length})</h3>
          <TaskQueue tasks={todayTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="warning" />
        </div>

        <div>
          <h3 className="text-neutral-700 font-semibold mb-3">Upcoming ({upcomingTasks.length})</h3>
          <TaskQueue tasks={upcomingTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Today's Discharges - Execution Checklist</h2>
        {todayDischarges.length ? (
          todayDischarges.map((patient) => (
            <DischargeChecklist key={patient.id} patient={patient} onStepComplete={handleStepComplete} />
          ))
        ) : (
          <EmptyState message="No discharge checklists due today." />
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
