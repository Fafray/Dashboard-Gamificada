self.addEventListener('push', function (event) {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'Daily Quest', body: event.data.text() }; }

  const options = {
    body: data.body || '',
    icon: '/characters/e-rank.jpg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    tag: data.tag || 'daily-quest',
    renotify: true,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Daily Quest', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
