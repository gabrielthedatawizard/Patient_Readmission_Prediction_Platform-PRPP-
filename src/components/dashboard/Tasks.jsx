import React, { useMemo, useState } from "react";
import {
  Clock,
  AlertCircle,
  Phone,
  FileText,
  User,
  Filter,
  Pill,
  Home,
  MessageSquare,
} from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import Button from "../common/Button";
import { useI18n } from "../../context/I18nProvider";

/**
 * Tasks Component
 * Action queue for follow-ups, discharge tasks, and interventions
 */

const Tasks = ({ onPatientSelect, onTaskUpdate, tasks = [], patients = [] }) => {
  const { language, t } = useI18n();
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [actionError, setActionError] = useState("");

  const priorityLabels = {
    high: language === "sw" ? "Kipaumbele cha juu" : "High priority",
    medium: language === "sw" ? "Kipaumbele cha kati" : "Medium priority",
    low: language === "sw" ? "Kipaumbele cha chini" : "Low priority",
  };

  const statusLabels = {
    pending: t("pending"),
    completed: t("completed"),
    overdue: t("overdue"),
    "in-progress": t("inProgress"),
    scheduled: language === "sw" ? "Imepangwa" : "Scheduled",
  };

  const normalizedTasks = useMemo(() => {
    const patientById = new Map(patients.map((patient) => [patient.id, patient]));

    return tasks.map((task) => ({
      ...task,
      patient: task.patient || patientById.get(task.patientId) || null,
      dueDate:
        task.dueDate instanceof Date
          ? task.dueDate
          : new Date(task.dueDate || Date.now()),
      status: task.status || "pending",
      priority: task.priority || "medium",
    }));
  }, [patients, tasks]);

  const filteredTasks = normalizedTasks
    .filter((task) => {
      if (filter === "pending") {
        return (
          task.status === "pending" ||
          task.status === "scheduled" ||
          task.status === "in-progress"
        );
      }
      if (filter === "overdue") {
        return new Date() > task.dueDate && task.status !== "completed";
      }
      if (filter === "completed") {
        return task.status === "completed";
      }
      return true;
    })
    .filter((task) => {
      if (priorityFilter === "all") {
        return true;
      }
      return task.priority === priorityFilter;
    });

  const stats = {
    total: normalizedTasks.length,
    highPriority: normalizedTasks.filter(
      (task) => task.priority === "high" && task.status !== "completed",
    ).length,
    overdue: normalizedTasks.filter(
      (task) => new Date() > task.dueDate && task.status !== "completed",
    ).length,
    completed: normalizedTasks.filter((task) => task.status === "completed").length,
  };

  const getTaskIcon = (category, type) => {
    switch (category) {
      case "medication":
        return <Pill className="w-5 h-5" />;
      case "education":
        return <MessageSquare className="w-5 h-5" />;
      case "followup":
        return <Phone className="w-5 h-5" />;
      case "community":
        return <Home className="w-5 h-5" />;
      default:
        if (String(type || "").includes("medication")) {
          return <Pill className="w-5 h-5" />;
        }
        if (String(type || "").includes("education")) {
          return <MessageSquare className="w-5 h-5" />;
        }
        return <FileText className="w-5 h-5" />;
    }
  };

  const isOverdue = (date) => new Date() > date;

  const handleUpdateTaskStatus = async (task, status) => {
    if (!onTaskUpdate) {
      return;
    }

    setUpdatingTaskId(task.id);
    setActionError("");
    try {
      await onTaskUpdate(task, status);
    } catch (error) {
      setActionError(
        error?.message ||
          (language === "sw" ? "Imeshindikana kusasisha kazi." : "Task update failed."),
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const formatDueDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return t("today");
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return language === "sw" ? "Kesho" : "Tomorrow";
    }
    return date.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-US");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("tasks")}</h1>
          <p className="mt-1 text-gray-600">
            {language === "sw"
              ? "Simamia hatua za matibabu na shughuli za ufuatiliaji."
              : "Manage interventions and follow-up activities."}
          </p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <Button
            variant="secondary"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setFilter((previous) => (previous === "all" ? "pending" : "all"))}
          >
            {t("filter")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4" hover={false}>
          <p className="text-sm text-gray-500">{language === "sw" ? "Kazi zote" : "Total tasks"}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="bg-red-50/50 p-4" hover={false}>
          <p className="text-sm text-red-600">{language === "sw" ? "Kipaumbele cha juu" : "High priority"}</p>
          <p className="text-2xl font-bold text-red-700">{stats.highPriority}</p>
        </Card>
        <Card className="bg-amber-50/50 p-4" hover={false}>
          <p className="text-sm text-amber-600">{t("overdue")}</p>
          <p className="text-2xl font-bold text-amber-700">{stats.overdue}</p>
        </Card>
        <Card className="bg-emerald-50/50 p-4" hover={false}>
          <p className="text-sm text-emerald-600">{t("completed")}</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: language === "sw" ? "Kazi zote" : "All tasks" },
          { id: "pending", label: t("pending") },
          { id: "overdue", label: t("overdue") },
          { id: "completed", label: t("completed") },
        ].map((entry) => (
          <button
            key={entry.id}
            onClick={() => setFilter(entry.id)}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              filter === entry.id
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {entry.label}
          </button>
        ))}
        <div className="mx-2 hidden h-8 w-px bg-gray-300 sm:block" />
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 text-sm outline-none focus:border-teal-500 sm:w-auto"
        >
          <option value="all">{language === "sw" ? "Vipaumbele vyote" : "All priorities"}</option>
          <option value="high">{language === "sw" ? "Kipaumbele cha juu" : "High priority"}</option>
          <option value="medium">{language === "sw" ? "Kipaumbele cha kati" : "Medium priority"}</option>
          <option value="low">{language === "sw" ? "Kipaumbele cha chini" : "Low priority"}</option>
        </select>
      </div>

      {actionError && (
        <Card className="border-red-200 bg-red-50 p-3" hover={false}>
          <p className="text-sm text-red-700">{actionError}</p>
        </Card>
      )}

      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className={`cursor-pointer p-4 transition-all hover:shadow-lg ${
              isOverdue(task.dueDate) && task.status !== "completed"
                ? "border-red-300 bg-red-50/30"
                : task.priority === "high" && task.status !== "completed"
                  ? "border-amber-300 bg-amber-50/30"
                  : ""
            }`}
            onClick={() => onPatientSelect?.(task.patient)}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className={`rounded-xl p-3 ${
                  task.category === "followup"
                    ? "bg-blue-100 text-blue-600"
                    : task.priority === "high"
                      ? "bg-red-100 text-red-600"
                      : "bg-teal-100 text-teal-600"
                }`}
              >
                {getTaskIcon(task.category, task.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      <User className="mr-1 inline w-4 h-4" />
                      {task.patient?.name || task.patientId}
                      {task.patient && (
                        <>
                          <span className="mx-2">-</span>
                          <Badge variant={String(task.patient.riskTier).toLowerCase()} size="sm">
                            {task.patient.riskTier} {t("riskSuffix")}
                          </Badge>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        isOverdue(task.dueDate) && task.status !== "completed"
                          ? "text-red-600"
                          : task.priority === "high"
                            ? "text-amber-600"
                            : "text-gray-600"
                      }`}
                    >
                      {isOverdue(task.dueDate) && task.status !== "completed" ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      {formatDueDate(task.dueDate)}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {task.patient?.ward ||
                        (language === "sw" ? "Wodi haijapangwa" : "Ward not assigned")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={task.priority === "high" ? "danger" : "warning"} size="sm">
                    {priorityLabels[task.priority] || priorityLabels.medium}
                  </Badge>
                  <Badge
                    variant={
                      task.status === "completed"
                        ? "success"
                        : task.status === "in-progress"
                          ? "info"
                          : "default"
                    }
                    size="sm"
                  >
                    {statusLabels[task.status] || task.status}
                  </Badge>
                </div>

                {task.status !== "completed" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUpdateTaskStatus(task, "in-progress");
                        }}
                        loading={updatingTaskId === task.id}
                        disabled={updatingTaskId === task.id}
                      >
                        {language === "sw" ? "Anza" : "Start"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleUpdateTaskStatus(task, "completed");
                      }}
                      loading={updatingTaskId === task.id}
                      disabled={updatingTaskId === task.id}
                    >
                      {language === "sw" ? "Kamilisha" : "Mark done"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-sm text-gray-600">
              {language === "sw"
                ? "Hakuna kazi zinazolingana na vichujio vya sasa."
                : "No tasks match your current filters."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tasks;
