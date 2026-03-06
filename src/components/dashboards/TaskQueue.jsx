import { Calendar, CheckCircle } from "lucide-react";
import Button from "../common/Button";

const VARIANT_CLASSES = {
  danger: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  default: "border-neutral-200 bg-white",
};

export const TaskQueue = ({ tasks = [], onMarkDone, variant = "default", doneTaskId = null }) => {
  if (!tasks.length) {
    return <p className="text-sm text-neutral-500">No tasks in this section.</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.default}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-neutral-900 mb-1">{task.title}</h4>
              <p className="text-sm text-neutral-600 mb-2">
                Patient: <span className="font-medium">{task.patient?.name || task.patientId || "-"}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("sw-TZ") : "-"}
                </span>
                <span
                  className={`px-2 py-1 rounded font-medium ${
                    task.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : task.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {task.priority || "medium"}
                </span>
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">{task.category || "general"}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="success"
              loading={doneTaskId === task.id}
              onClick={() => onMarkDone?.(task.id)}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Mark Done
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskQueue;
