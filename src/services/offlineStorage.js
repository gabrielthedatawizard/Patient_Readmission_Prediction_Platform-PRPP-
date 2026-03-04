const DB_NAME = "trip-offline";
const DB_VERSION = 1;
const STORES = ["patients", "predictions", "tasks"];

const openDatabase = () =>
  new Promise((resolve, reject) => {
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
