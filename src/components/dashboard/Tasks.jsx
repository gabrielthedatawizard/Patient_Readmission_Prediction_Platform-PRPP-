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

/**
 * Tasks Component
 * Action queue for follow-ups, discharge tasks, and interventions
 */

const Tasks = ({ onPatientSelect, tasks = [], patients = [] }) => {
  const [filter, setFilter] = useState("all"); // all, pending, overdue, completed
  const [priorityFilter, setPriorityFilter] = useState("all");

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
        return task.status === "pending" || task.status === "scheduled" || task.status === "in-progress";
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

  const formatDueDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tasks & Follow-up</h1>
          <p className="text-gray-600 mt-1">
            Manage interventions and follow-up activities
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4" hover={false}>
          <p className="text-sm text-gray-500">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-red-50/50" hover={false}>
          <p className="text-sm text-red-600">High Priority</p>
          <p className="text-2xl font-bold text-red-700">{stats.highPriority}</p>
        </Card>
        <Card className="p-4 bg-amber-50/50" hover={false}>
          <p className="text-sm text-amber-600">Overdue</p>
          <p className="text-2xl font-bold text-amber-700">{stats.overdue}</p>
        </Card>
        <Card className="p-4 bg-emerald-50/50" hover={false}>
          <p className="text-sm text-emerald-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All Tasks" },
          { id: "pending", label: "Pending" },
          { id: "overdue", label: "Overdue" },
          { id: "completed", label: "Completed" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f.id
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="hidden sm:block w-px h-8 bg-gray-300 mx-2" />
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          className="w-full sm:w-auto px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
              isOverdue(task.dueDate) && task.status !== "completed"
                ? "border-red-300 bg-red-50/30"
                : task.priority === "high" && task.status !== "completed"
                  ? "border-amber-300 bg-amber-50/30"
                  : ""
            }`}
            onClick={() => onPatientSelect?.(task.patient)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div
                className={`p-3 rounded-xl ${
                  task.category === "followup"
                    ? "bg-blue-100 text-blue-600"
                    : task.priority === "high"
                      ? "bg-red-100 text-red-600"
                      : "bg-teal-100 text-teal-600"
                }`}
              >
                {getTaskIcon(task.category, task.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <User className="w-4 h-4 inline mr-1" />
                      {task.patient?.name || task.patientId}
                      {task.patient && (
                        <>
                          <span className="mx-2">·</span>
                          <Badge
                            variant={String(task.patient.riskTier).toLowerCase()}
                            size="sm"
                          >
                            {task.patient.riskTier} Risk
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
                    <p className="text-xs text-gray-500 mt-1">
                      {task.patient?.ward || "Ward not assigned"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge
                    variant={task.priority === "high" ? "danger" : "warning"}
                    size="sm"
                  >
                    {task.priority} Priority
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
                    {task.status}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-sm text-gray-600">
              No tasks match your current filters.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tasks;
