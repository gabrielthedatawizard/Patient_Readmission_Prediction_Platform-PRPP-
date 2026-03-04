const DB_NAME = "trip-offline";
const DB_VERSION = 2;
const STORES = ["patients", "predictions", "tasks", "syncQueue"];

const ensureIndexedDb = () => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
};

const openDatabase = () =>
  new Promise((resolve, reject) => {
    try {
      ensureIndexedDb();
    } catch (error) {
      reject(error);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async (storeName, mode, operation) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePatientOffline = async (patient) =>
  runTransaction("patients", "readwrite", (store) => store.put(patient));

export const getOfflinePatients = async () =>
  runTransaction("patients", "readonly", (store) => store.getAll());

export const savePredictionOffline = async (prediction) =>
  runTransaction("predictions", "readwrite", (store) => store.put(prediction));

export const getOfflinePredictions = async () =>
  runTransaction("predictions", "readonly", (store) => store.getAll());

export const saveTaskOffline = async (task) =>
  runTransaction("tasks", "readwrite", (store) => store.put(task));

export const getOfflineTasks = async () =>
  runTransaction("tasks", "readonly", (store) => store.getAll());

export const savePatientsOffline = async (patients = []) =>
  Promise.all((patients || []).map((patient) => savePatientOffline(patient)));

export const saveTasksOffline = async (tasks = []) =>
  Promise.all((tasks || []).map((task) => saveTaskOffline(task)));

export const enqueueSyncOperation = async (operation) => {
  const queueItem = {
    id:
      operation?.id ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    operation,
    queuedAt: operation?.queuedAt || new Date().toISOString(),
  };

  await runTransaction("syncQueue", "readwrite", (store) => store.put(queueItem));
  return queueItem;
};

export const getQueuedSyncOperations = async () =>
  runTransaction("syncQueue", "readonly", (store) => store.getAll());

export const removeQueuedSyncOperation = async (id) =>
  runTransaction("syncQueue", "readwrite", (store) => store.delete(id));
