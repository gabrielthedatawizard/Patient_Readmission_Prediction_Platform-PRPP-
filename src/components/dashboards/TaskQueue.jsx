import { Calendar, CheckCircle } from "lucide-react";
import Button from "../common/Button";
import { useI18n } from "../../context/I18nProvider";

const VARIANT_CLASSES = {
  danger: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  default: "border-neutral-200 bg-white",
};

export const TaskQueue = ({ tasks = [], onMarkDone, variant = "default", doneTaskId = null }) => {
  const { language, t } = useI18n();

  if (!tasks.length) {
    return (
      <p className="text-sm text-neutral-500">
        {language === "sw" ? "Hakuna kazi katika sehemu hii." : "No tasks in this section."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.default}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-neutral-900">{task.title}</h4>
              <p className="mb-2 text-sm text-neutral-600">
                {t("patientLabel")}: <span className="font-medium">{task.patient?.name || task.patientId || "-"}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-700">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {language === "sw" ? "Mwisho" : "Due"}: {task.dueDate ? new Date(task.dueDate).toLocaleDateString(language === "sw" ? "sw-TZ" : "en-US") : "-"}
                </span>
                <span
                  className={`rounded-full px-2 py-1 font-medium ${
                    task.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : task.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {task.priority === "high"
                    ? language === "sw"
                      ? "Juu"
                      : "High"
                    : task.priority === "medium"
                      ? language === "sw"
                        ? "Kati"
                        : "Medium"
                      : language === "sw"
                        ? "Chini"
                        : "Low"}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-700">
                  {task.category || (language === "sw" ? "Jumla" : "General")}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="success"
              loading={doneTaskId === task.id}
              onClick={() => onMarkDone?.(task.id)}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              {language === "sw" ? "Kamilisha" : "Mark done"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskQueue;
