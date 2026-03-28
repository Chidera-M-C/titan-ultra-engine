// ── sw.js — place this in your /public folder ─────────────────────────────
const CACHE_NAME = 'nudely-v1';

// ── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// ── Push received ─────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: 'Nudely', body: e.data ? e.data.text() : 'You have a new notification' };
  }

  const title   = data.title   || 'Nudely';
  const options = {
    body:    data.body    || 'You have a new notification',
    icon:    data.icon    || '/icons/icon-192.png',
    badge:   data.badge   || '/icons/badge-72.png',
    image:   data.image   || undefined,
    data:    { url: data.url || '/' },
    tag:     data.tag     || 'nudely-notif',
    renotify: true,
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
