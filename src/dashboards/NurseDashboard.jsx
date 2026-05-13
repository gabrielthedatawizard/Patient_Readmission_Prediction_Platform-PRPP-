import { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import {
  DashboardSkeleton,
  DischargeChecklist,
  EmptyState,
  ErrorState,
  KPICard,
  TaskQueue,
  DashboardLayout,
  DashboardSection,
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
  const [taskFeedback, setTaskFeedback] = useState("");
  const [taskError, setTaskError] = useState("");

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
    setTaskFeedback("");
    setTaskError("");
    setDoneTaskId(taskId);
    try {
      await updateTask(taskId, { status: "completed" });
      await refresh();
      setTaskFeedback(
        language === "sw"
          ? "Kazi imekamilishwa na dashibodi imeboreshwa."
          : "Task completed and the dashboard has been refreshed.",
      );
    } catch (err) {
      setTaskError(
        err?.message ||
          (language === "sw"
            ? "Imeshindikana kukamilisha kazi kutoka dashibodini."
            : "Unable to complete the task from the dashboard."),
      );
    } finally {
      setDoneTaskId(null);
    }
  };

  if (loading && !tasksResponse) {
    return <DashboardSkeleton cards={4} />;
  }

  if (error && !tasksResponse) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  return (
    <DashboardLayout
      title={language === "sw" ? "Majukumu yangu" : "My tasks"}
      subtitle={
        language === "sw"
          ? "Uratibu wa kuondoka na kazi za huduma ya mgonjwa."
          : "Discharge coordination and patient care tasks."
      }
      kpis={[
        <KPICard
          key="today"
          title={language === "sw" ? "Kazi za leo" : "Tasks due today"}
          value={todayTasks.length}
          icon={Calendar}
          footer={language === "sw" ? "Kamilisha kabla ya siku kuisha" : "Must complete by end of day"}
          variant="default"
        />,
        <KPICard
          key="overdue"
          title={language === "sw" ? "Zimechelewa" : "Overdue"}
          value={overdueTasks.length}
          icon={AlertCircle}
          footer={
            overdueTasks.length > 0
              ? language === "sw" ? "Zinahitaji uangalizi wa haraka" : "Needs immediate attention"
              : language === "sw" ? "Hakuna kazi zilizochelewa" : "No overdue tasks"
          }
          variant={overdueTasks.length > 0 ? "danger" : "default"}
        />,
        <KPICard
          key="completed"
          title={language === "sw" ? "Zimekamilika leo" : "Completed today"}
          value={completedToday.length}
          icon={CheckCircle}
          footer={
            language === "sw"
              ? `Wastani: ${calculateAvgTime(completedToday)} dk`
              : `Avg time: ${calculateAvgTime(completedToday)} min`
          }
          variant="success"
        />,
        <KPICard
          key="upcoming"
          title={language === "sw" ? "Zinazofuata" : "Upcoming"}
          value={upcomingTasks.length}
          icon={Clock}
          footer={language === "sw" ? "Siku 7 zijazo" : "Next 7 days"}
          variant="info"
        />,
      ]}
    >

      <DashboardSection
        title={language === "sw" ? "Foleni ya kazi yenye kipaumbele" : "Task queue — prioritized"}
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
        {overdueTasks.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              {language === "sw" ? `Zimechelewa (${overdueTasks.length})` : `Overdue (${overdueTasks.length})`}
            </h3>
            <TaskQueue tasks={overdueTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="danger" />
          </div>
        )}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            {language === "sw" ? `Leo (${todayTasks.length})` : `Due today (${todayTasks.length})`}
          </h3>
          <TaskQueue tasks={todayTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} variant="warning" />
        </div>
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-slate-400">
            {language === "sw" ? `Zinazofuata (${upcomingTasks.length})` : `Upcoming (${upcomingTasks.length})`}
          </h3>
          <TaskQueue tasks={upcomingTasks} onMarkDone={handleMarkDone} doneTaskId={doneTaskId} />
        </div>
      </DashboardSection>

      <DashboardSection
        title={
          language === "sw"
            ? "Checklist ya utekelezaji wa wanaoondoka leo"
            : "Today's discharges — execution checklist"
        }
      >
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900/50 px-4 py-3 text-sm text-sky-800 dark:text-sky-300">
          {language === "sw"
            ? "Checklist hii inaonyesha utayari wa kuondoka kulingana na data ya sasa. Tumia workflow ya mgonjwa kuhifadhi mabadiliko rasmi ya utekelezaji."
            : "This checklist reflects discharge readiness from current data. Use the patient workflow to persist official execution updates."}
        </div>
        {todayDischarges.length ? (
          todayDischarges.map((patient) => (
            <DischargeChecklist
              key={patient.id}
              patient={patient}
              interactive={false}
              readOnlyMessage={
                language === "sw"
                  ? "Mwonekano wa checklist hapa ni wa mapitio pekee."
                  : "Checklist actions are review-only in this dashboard view."
              }
            />
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
      </DashboardSection>
    </DashboardLayout>
  );
};

export default NurseDashboard;
