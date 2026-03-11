import { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import {
  DashboardSkeleton,
  DischargeChecklist,
  EmptyState,
  ErrorState,
  KPICard,
  TaskQueue,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { updateTask } from "../services/apiClient";
import { useI18n } from "../context/I18nProvider";

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
  const { language } = useI18n();
  const [doneTaskId, setDoneTaskId] = useState(null);

  const { data: tasksResponse, loading, error, refresh } = useDashboardData(
    `/tasks?assignedTo=${encodeURIComponent(nurseId || "self")}&include=patient`,
    90000,
  );
  const { data: patientsResponse } = useDashboardData(
    `/patients?assignedTo=${encodeURIComponent(nurseId || "self")}&include=tasks,predictions`,
    90000,
  );

  const myTasks = toArray(tasksResponse?.tasks).filter(
    (task) => task.status !== "done" && task.status !== "completed",
  );
  const completedToday = toArray(tasksResponse?.tasks).filter((task) => {
    if ((task.status !== "done" && task.status !== "completed") || !task.completedAt) {
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
        <h1 className="text-3xl font-bold text-neutral-900">
          {language === "sw" ? "Majukumu yangu" : "My tasks"}
        </h1>
        <p className="mt-1 text-neutral-600">
          {language === "sw"
            ? "Uratibu wa kuondoka na kazi za huduma ya mgonjwa."
            : "Discharge coordination and patient care tasks."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard
          title={language === "sw" ? "Kazi za leo" : "Tasks due today"}
          value={todayTasks.length}
          icon={Calendar}
          footer={language === "sw" ? "Kamilisha kabla ya siku kuisha" : "Must complete by end of day"}
        />
        <KPICard
          title={language === "sw" ? "Zimechelewa" : "Overdue"}
          value={overdueTasks.length}
          icon={AlertCircle}
          footer={
            overdueTasks.length > 0
              ? language === "sw"
                ? "Zinahitaji uangalizi wa haraka"
                : "Needs immediate attention"
              : language === "sw"
                ? "Hakuna kazi zilizochelewa"
                : "No overdue tasks"
          }
          className={overdueTasks.length > 0 ? "border-red-300 bg-red-50" : ""}
        />
        <KPICard
          title={language === "sw" ? "Zimekamilika leo" : "Completed today"}
          value={completedToday.length}
          icon={CheckCircle}
          footer={
            language === "sw"
              ? `Wastani: ${calculateAvgTime(completedToday)} dk`
              : `Avg time: ${calculateAvgTime(completedToday)} min`
          }
        />
        <KPICard
          title={language === "sw" ? "Zinazofuata" : "Upcoming"}
          value={upcomingTasks.length}
          icon={Clock}
          footer={language === "sw" ? "Siku 7 zijazo" : "Next 7 days"}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-neutral-900">
          {language === "sw" ? "Foleni ya kazi yenye kipaumbele" : "Task queue - prioritized"}
        </h2>

        {overdueTasks.length ? (
          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-red-700">
              {language === "sw" ? `Zimechelewa (${overdueTasks.length})` : `Overdue (${overdueTasks.length})`}
            </h3>
            <TaskQueue tasks={overdueTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="danger" />
          </div>
        ) : null}

        <div className="mb-6">
          <h3 className="mb-3 font-semibold text-amber-700">
            {language === "sw" ? `Leo (${todayTasks.length})` : `Due today (${todayTasks.length})`}
          </h3>
          <TaskQueue tasks={todayTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="warning" />
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-neutral-700">
            {language === "sw" ? `Zinazofuata (${upcomingTasks.length})` : `Upcoming (${upcomingTasks.length})`}
          </h3>
          <TaskQueue tasks={upcomingTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-neutral-900">
          {language === "sw"
            ? "Checklist ya utekelezaji wa wanaoondoka leo"
            : "Today's discharges - execution checklist"}
        </h2>
        {todayDischarges.length ? (
          todayDischarges.map((patient) => (
            <DischargeChecklist key={patient.id} patient={patient} onStepComplete={handleStepComplete} />
          ))
        ) : (
          <EmptyState
            message={
              language === "sw"
                ? "Hakuna checklist za kuondoka zinazohitajika leo."
                : "No discharge checklists due today."
            }
          />
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
