import {
  enqueueSyncOperation,
  getQueuedSyncOperations,
  removeQueuedSyncOperation,
} from "./offlineStorage";
import { buildApiUrl } from "./runtimeConfig";

function normalizeTaskStatusForSync(status) {
  if (status === "completed") {
    return "done";
  }
  return status;
}

function buildIdempotencyKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function queueTaskStatusUpdate({ taskId, status, assignee, dueDate }) {
  const operation = {
    operationId: buildIdempotencyKey(`task-${taskId}`),
    type: "task_status_update",
    data: {
      taskId,
      status: normalizeTaskStatusForSync(status),
      assignee,
      dueDate,
      clientUpdatedAt: new Date().toISOString(),
    },
  };

  return enqueueSyncOperation({ operation });
}

export async function queuePatientUpsert(patient) {
  const id = patient?.id || buildIdempotencyKey("patient");
  const operation = {
    operationId: buildIdempotencyKey(`patient-upsert-${id}`),
    type: "patient_upsert",
    data: {
      ...patient,
      clientUpdatedAt: patient?.clientUpdatedAt || new Date().toISOString(),
    },
  };

  return enqueueSyncOperation({ operation });
}

export async function queueTaskCreate({
  patientId,
  title,
  category,
  priority,
  assignee,
  predictionId,
  dueDate,
}) {
  const operation = {
    operationId: buildIdempotencyKey(`task-create-${patientId}`),
    type: "task_create",
    data: {
      patientId,
      title,
      category,
      priority,
      assignee,
      predictionId,
      dueDate,
      clientUpdatedAt: new Date().toISOString(),
    },
  };

  return enqueueSyncOperation({ operation });
}

export async function queuePredictionOverride({ predictionId, newTier, reason }) {
  const operation = {
    operationId: buildIdempotencyKey(`prediction-override-${predictionId}`),
    type: "prediction_override",
    data: {
      predictionId,
      newTier,
      reason,
      clientUpdatedAt: new Date().toISOString(),
    },
  };

  return enqueueSyncOperation({ operation });
}

export async function flushSyncQueue() {
  const queued = (await getQueuedSyncOperations()).sort((left, right) =>
    String(left.queuedAt).localeCompare(String(right.queuedAt)),
  );

  if (!queued.length) {
    return { flushed: 0, remaining: 0 };
  }

  let flushed = 0;
  const batchSize = 20;

  for (let index = 0; index < queued.length; index += batchSize) {
    const batch = queued.slice(index, index + batchSize);
    const idempotencyKey = buildIdempotencyKey("sync-batch");

    try {
      const response = await fetch(buildApiUrl("/sync/push"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          operations: batch.map((item) => item.operation),
        }),
      });

      if (!response.ok) {
        break;
      }

      const payload = await response.json();
      const results = Array.isArray(payload?.results) ? payload.results : [];
      const statusByOperationId = new Map(
        results.map((result) => [result.operationId, result.status]),
      );

      for (const item of batch) {
        const operationId = item.operation?.operationId;
        const status = statusByOperationId.get(operationId);

        if (status === "applied" || status === "rejected" || status === "conflict") {
          await removeQueuedSyncOperation(item.id);
          flushed += 1;
        }
      }
    } catch (error) {
      break;
    }
  }

  const remaining = (await getQueuedSyncOperations()).length;
  return { flushed, remaining };
}
