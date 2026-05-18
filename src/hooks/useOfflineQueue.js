import { useEffect, useCallback, useRef, useState } from 'react';
import { useConnectivityStatus } from './useConnectivityStatus';

const DB_NAME = 'trip-offline-queue';
const STORE_NAME = 'mutations';
const DB_VERSION = 1;

let _dbPromise = null;

function getDB() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => {
        _dbPromise = null;
        reject(e.target.error);
      };
    });
  }
  return _dbPromise;
}

async function idbEnqueue(method, url, body, headers = {}) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      method,
      url,
      body,
      headers,
      queuedAt: new Date().toISOString(),
      attempts: 0,
    };
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbGetAll() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbDelete(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbCount() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = (e) => resolve(e.target.result || 0);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function useOfflineQueue() {
  const isOnline = useConnectivityStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      if (!window.indexedDB) return;
      const count = await idbCount();
      setPendingCount(count);
    } catch {
      // IndexedDB unavailable in this context
    }
  }, []);

  // Enqueue a mutation for offline-first execution.
  // Callers should also immediately try the network call; this is the fallback.
  const enqueue = useCallback(
    async (method, url, body, headers = {}) => {
      try {
        await idbEnqueue(method, url, body, headers);
        await refreshCount();
        // Request background sync if the browser supports it
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const reg = await navigator.serviceWorker.ready.catch(() => null);
          if (reg) {
            await reg.sync.register('trip-offline-queue').catch(() => {});
          }
        }
      } catch {
        // Silently fail — queue is best-effort
      }
    },
    [refreshCount],
  );

  const processQueue = useCallback(async () => {
    if (syncingRef.current) return 0;
    syncingRef.current = true;
    setIsSyncing(true);
    let synced = 0;

    try {
      const items = await idbGetAll();
      for (const item of items) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: { 'Content-Type': 'application/json', ...item.headers },
            body: item.body != null ? JSON.stringify(item.body) : undefined,
            credentials: 'same-origin',
          });
          if (response.ok) {
            await idbDelete(item.id);
            synced += 1;
          }
        } catch {
          // Network still unavailable for this item — leave in queue
        }
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }

    return synced;
  }, [refreshCount]);

  // Auto-process queue when connectivity is restored
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return { enqueue, processQueue, pendingCount, isSyncing };
}
