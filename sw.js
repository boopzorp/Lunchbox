// Lunchbox Service Worker for Native macOS & System Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        if ('focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Gentle Re-Pin: Periodic & Background Sync handlers (works even when PWA is closed completely)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'lunchbox-persistent-nudge' || event.tag === 'lunchbox-6h-nudge') {
    event.waitUntil(showBackgroundPersistentNotification());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'lunchbox-background-nudge') {
    event.waitUntil(showBackgroundPersistentNotification());
  }
});

function showBackgroundPersistentNotification() {
  return self.registration.showNotification(
    "🍱 Lunchbox Vault — Always Active",
    {
      body: "Your remembrance vault is pinned. Tap anytime to jump back in!",
      icon: 'icon.png',
      badge: 'icon.png',
      tag: 'lunchbox-sticky-persistent',
      requireInteraction: true,
      ongoing: true,
      renotify: false,
      data: { url: '/', timestamp: Date.now() }
    }
  );
}
