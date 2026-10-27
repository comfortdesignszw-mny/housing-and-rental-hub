// Background Service Worker notification handling for Comfort Housing and Rental Hub
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.actionUrl || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', actionUrl: targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'Comfort Housing Alert';
    const options = {
      body: payload.message || payload.body || 'New rental alert for you.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: payload.silent ? [] : [300, 150, 300, 150, 450],
      requireInteraction: payload.wakeDevice !== false,
      tag: payload.id || 'comfort-notif',
      renotify: true,
      data: { actionUrl: payload.actionUrl || '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event in SW:', err);
  }
});
