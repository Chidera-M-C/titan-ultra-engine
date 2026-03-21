const CACHE_NAME = 'nudely-v1';

// On install — cache nothing critical, just activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// On activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests entirely
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (
          event.request.url.includes('/icons/') ||
          event.request.url.includes('/assets/')
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
