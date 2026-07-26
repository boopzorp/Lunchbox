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

// Re-pin persistent notification if dismissed or cleared on Android OS
self.addEventListener('notificationclose', (event) => {
  if (event.notification && event.notification.tag === 'lunchbox-sticky-persistent') {
    event.waitUntil(
      self.registration.showNotification(
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
      )
    );
  }
});
