const STATIC_CACHE_NAME = "trip-static-v2.6";
const API_CACHE_NAME = "trip-api-v1.0";
const OFFLINE_QUEUE_DB = "trip-offline-queue";
const APP_SHELL = ["/", "/manifest.json"];

// API endpoints that are safe to cache for offline read
const API_CACHE_PREFIXES = [
  "/api/patients",
  "/api/chw/visits",
  "/api/predictions",
  "/api/dashboard",
  "/api/tasks",
  "/api/analytics",
  "/api/alerts",
  "/api/follow-up-schedules",
];

// Cache TTL: 4 hours (in ms) — stale after this, even if offline
const API_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isCacheableApiEndpoint(url) {
  return API_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isStaticAsset(request, url) {
  const STATIC_DESTINATIONS = new Set([
    "document",
    "style",
    "script",
    "image",
    "font",
  ]);
  if (STATIC_DESTINATIONS.has(request.destination)) return true;
  return /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname);
}

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== STATIC_CACHE_NAME && key !== API_CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET (mutations are handled by useOfflineQueue in main thread)
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!isSameOrigin(url)) return;

  // API GET: network-first with cache fallback
  if (isApiRequest(url) && isCacheableApiEndpoint(url)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Navigation: network-first, fall back to app shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/")
          .then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirstStatic(request));
  }
});

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const clone = response.clone();
      const cache = await caches.open(API_CACHE_NAME);
      // Tag with fetch timestamp for TTL checks
      const headers = new Headers(clone.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const taggedResponse = new Response(await clone.blob(), {
        status: clone.status,
        statusText: clone.statusText,
        headers,
      });
      await cache.put(request, taggedResponse);
    }
    return response;
  } catch {
    // Offline — serve from cache
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get("x-sw-cached-at") || 0);
      const isStale = Date.now() - cachedAt > API_CACHE_TTL_MS;
      if (!isStale) return cached;
    }
    // Return structured offline response so React Query can detect it
    return new Response(
      JSON.stringify({
        offline: true,
        data: [],
        items: [],
        message: "Offline — showing cached snapshot",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "x-sw-offline": "1",
        },
      },
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    const clone = response.clone();
    const cache = await caches.open(STATIC_CACHE_NAME);
    await cache.put(request, clone);
  }
  return response;
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "trip-offline-queue") {
    event.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue() {
  let db;
  try {
    db = await openQueueDB();
  } catch {
    return;
  }

  const items = await getAllFromStore(db, "mutations");

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...(item.headers || {}),
        },
        body: item.body != null ? JSON.stringify(item.body) : undefined,
        credentials: "same-origin",
      });
      if (response.ok) {
        await deleteFromStore(db, "mutations", item.id);
      }
    } catch {
      // Stay queued — network still down
    }
  }
}

// ─── IndexedDB helpers (used only in SW context) ──────────────────────────────

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("mutations", {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}
