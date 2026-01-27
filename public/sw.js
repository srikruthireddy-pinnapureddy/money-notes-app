// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.message || data.body || 'You have a new notification',
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        groupId: data.groupId,
        type: data.type
      },
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'ExpenX', options)
    );
  } catch (error) {
    console.error('Error processing push event:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.groupId) {
    targetUrl = `/group/${data.groupId}`;
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
