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

// Handle Incoming Web Push Notifications (Works even when PWA/Chrome is completely closed)
self.addEventListener('push', (event) => {
  let data = { 
    type: 'persistent',
    title: "🍱 Lunchbox Vault — Always Active", 
    body: "Your remembrance vault is pinned. Tap anytime to jump back in!" 
  };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch(e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const isPersistent = data.type === 'persistent';
  
  const options = {
    body: data.body || "Your remembrance vault is waiting for you!",
    icon: 'icon.png',
    badge: 'icon.png',
    tag: data.tag || (isPersistent ? 'lunchbox-sticky-persistent' : 'lunchbox-push-' + Date.now()),
    requireInteraction: isPersistent ? true : false,
    ongoing: isPersistent ? true : false,
    renotify: isPersistent ? false : true,
    data: { url: '/', timestamp: Date.now() }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "🍱 Lunchbox", options)
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

// Listen to messages from app main thread to trigger background notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'TRIGGER_NUDGE') {
    self.registration.showNotification(event.data.title || "🍱 Lunchbox Check-in", {
      body: event.data.body || "Hey, I exist! Don't forget your active notebooks today.",
      icon: 'icon.png',
      badge: 'icon.png',
      tag: event.data.tag || ('lunchbox-nudge-' + Date.now()),
      requireInteraction: false,
      data: { url: '/', timestamp: Date.now() }
    });
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
