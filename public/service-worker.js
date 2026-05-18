// Bump version whenever the caching strategy changes — forces re-install
const STATIC_CACHE_NAME = "trip-static-v2.8";
const API_CACHE_NAME = "trip-api-v1.0";
const OFFLINE_QUEUE_DB = "trip-offline-queue";

// API endpoints safe to cache for offline read
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

// Cached API responses are considered stale after 4 hours
const API_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isCacheableApiEndpoint(url) {
  return API_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p));
}

// Vite dev-server internals — never cache these
function isViteInternal(url) {
  return (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/__") ||
    url.pathname.includes("?t=") ||
    url.pathname.includes("?v=") ||
    url.searchParams.has("t") ||
    url.searchParams.has("v")
  );
}

// Parse <script src>, <link href>, <link rel="modulepreload"> from HTML
function parseLinkedAssets(html) {
  const urls = new Set();

  for (const m of html.matchAll(/\bsrc="(\/[^"?#\s]+)"/g)) {
    if (/\.(js|mjs)(\?|$)/.test(m[1]) || !m[1].includes(".")) urls.add(m[1]);
  }
  for (const m of html.matchAll(/\bhref="(\/[^"?#\s]+)"/g)) {
    if (/\.(css|js|mjs|woff2?|ico|png|svg|webp)(\?|$)/.test(m[1])) urls.add(m[1]);
  }

  return [...urls];
}

// Minimal bilingual offline page shown when the app shell itself isn't in cache
function offlineFallbackPage() {
  const html = `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TRIP — Bila Mtandao / Offline</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f1f5f9;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
    .card{background:#fff;border-radius:1rem;padding:2.5rem;max-width:420px;
          width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .icon{font-size:3.5rem;margin-bottom:1.25rem}
    h1{font-size:1.4rem;font-weight:700;color:#1e293b;margin-bottom:.5rem}
    .sw{font-size:.85rem;color:#94a3b8;margin-bottom:1.25rem}
    p{font-size:.95rem;color:#475569;line-height:1.6;margin-bottom:1.5rem}
    button{background:#0d9488;color:#fff;border:none;padding:.75rem 2rem;
           border-radius:.5rem;cursor:pointer;font-size:1rem;font-weight:600;
           transition:background .2s}
    button:hover{background:#0f766e}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Bila Mtandao · Offline</h1>
    <p class="sw">Hakuna muunganisho wa mtandao unaonekana.<br>No network connection detected.</p>
    <p>Unganisha tena na ujaribu kupakia tena.<br>Reconnect and reload the page.</p>
    <button onclick="location.reload()">Jaribu tena · Retry</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

// ─── Install: pre-cache app shell + all linked assets ─────────────────────────
//
// This is the critical step that makes offline work. We fetch the root HTML
// while online, parse every <script src> and <link href>, and cache them all.
// Without this, the HTML shell loads offline but the JS bundles 404 → blank page.

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);

      // Step 1: basic shell (always succeeds)
      try {
        await cache.add("/");
      } catch {
        // Might fail in some CORS environments — not fatal
      }

      // Step 2: fetch root HTML, discover and pre-cache every linked asset
      try {
        const rootResp = await fetch("/", { cache: "no-cache" });
        if (!rootResp.ok) return;

        // Cache the root document itself
        await cache.put("/", rootResp.clone());

        // Parse all linked asset URLs
        const html = await rootResp.text();
        const assetUrls = parseLinkedAssets(html);

        // Cache each asset in parallel (silently ignore failures)
        await Promise.allSettled(
          assetUrls.map((url) =>
            fetch(url, { cache: "no-cache" })
              .then((r) => (r.ok ? cache.put(url, r) : null))
              .catch(() => null),
          ),
        );
      } catch {
        // Offline during SW install — skip pre-caching (will rely on runtime cache)
      }

      self.skipWaiting();
    })(),
  );
});

// ─── Activate: clean up old caches ────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE_NAME && k !== API_CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;
  if (isViteInternal(url)) return; // never cache HMR / Vite internals

  // ── Cacheable API endpoints: network-first, fall back to cached response ──
  if (isApiRequest(url) && isCacheableApiEndpoint(url)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // ── Other API calls: pass through, don't cache ────────────────────────────
  if (isApiRequest(url)) return;

  // ── Navigation (HTML documents): network-first, fall back to shell ────────
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // ── Everything else (JS, CSS, images, fonts, etc.): cache-first ──────────
  // This broad catch ensures ALL Vite chunks are cached on first online load
  // and served from cache on subsequent offline loads.
  event.respondWith(cacheFirstStatic(request));
});

// ─── Strategy: navigation ─────────────────────────────────────────────────────

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Opportunistically cache the navigated document
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline path: try cached root, then offline fallback page
    const cached =
      (await caches.match(request)) || (await caches.match("/"));
    return cached || offlineFallbackPage();
  }
}

// ─── Strategy: cache-first for static assets ─────────────────────────────────

async function cacheFirstStatic(request) {
  // Serve from cache immediately if available
  const cached = await caches.match(request);
  if (cached) return cached;

  // Not in cache — try network
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const clone = response.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, clone); // async, don't block the response
    }
    return response;
  } catch {
    // Offline and not in cache — return empty stubs to prevent hard load errors.
    // NOTE: If the main app bundle isn't cached, the app won't boot. The install-
    // time pre-cache above prevents this. These stubs are a last-resort safeguard.
    const url = new URL(request.url);
    if (/\.(js|mjs)$/.test(url.pathname)) {
      return new Response("/* TRIP offline stub */", {
        headers: { "Content-Type": "application/javascript" },
      });
    }
    if (/\.css$/.test(url.pathname)) {
      return new Response("/* TRIP offline stub */", {
        headers: { "Content-Type": "text/css" },
      });
    }
    return Response.error();
  }
}

// ─── Strategy: network-first for cacheable API endpoints ─────────────────────

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const clone = response.clone();
      const cache = await caches.open(API_CACHE_NAME);
      // Stamp with fetch time for TTL checks
      const headers = new Headers(clone.headers);
      headers.set("x-sw-cached-at", Date.now().toString());
      const stamped = new Response(await clone.blob(), {
        status: clone.status,
        statusText: clone.statusText,
        headers,
      });
      await cache.put(request, stamped);
    }
    return response;
  } catch {
    // Offline — serve cached version if within TTL
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get("x-sw-cached-at") || 0);
      if (Date.now() - cachedAt <= API_CACHE_TTL_MS) return cached;
    }
    // No fresh cache — return a structured offline envelope
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

// ─── Message handler (skip-waiting for instant activation) ───────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

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
        headers: { "Content-Type": "application/json", ...(item.headers || {}) },
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

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

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
