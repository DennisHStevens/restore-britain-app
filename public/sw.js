/**
 * Service Worker — Restore Britain PWA
 *
 * Strategy:
 * - On install: precache the app shell (index.html and icons)
 * - On fetch: cache-first for same-origin static assets,
 *   network-first for navigation requests (so fresh HTML is served when online),
 *   network-only for API/Supabase requests (never cache auth data)
 *
 * The Vite build produces hashed filenames for JS/CSS bundles, so those are
 * inherently cache-busted. We cache them on first request rather than
 * trying to precache unknown filenames.
 *
 * Cache version: bump CACHE_VERSION to force a full cache refresh on deploy.
 */

const CACHE_VERSION = 'rb-v1';
const PRECACHE_URLS = [
  '/',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: precache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately — don't wait for existing tabs to close
  self.skipWaiting();
});

// Activate: clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch: route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API calls or Edge Function requests
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.com')
  ) {
    return; // Let the browser handle it normally (network-only)
  }

  // Navigation requests (HTML pages): network-first with cache fallback
  // This ensures users get fresh content when online, but the app still
  // loads from cache when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response for offline use
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          // Offline: serve cached version
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  // Vite's hashed filenames mean cached versions are always correct.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
  }
});
