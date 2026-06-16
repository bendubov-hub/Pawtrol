importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB8im6abd9ZuD2YBH3C8zkNmluXWVxgwsU",
  authDomain: "pawtrol-eb66b.firebaseapp.com",
  projectId: "pawtrol-eb66b",
  storageBucket: "pawtrol-eb66b.firebasestorage.app",
  messagingSenderId: "282499962813",
  appId: "1:282499962813:web:0ca86d85b9c6dfbe29e4d4",
});

const messaging = firebase.messaging();

// firebase-messaging-compat replays the last FCM payload every time the SW wakes up.
// Guard against showing the same notification twice using Cache API as a dedup store.
messaging.onBackgroundMessage(async payload => {
  const { title, body, icon, url } = payload.data || {};

  // Build a stable key from the message content
  const msgKey = `${title}|${body}|${url}`;
  const cacheKey = new Request(`https://pawtrol-notif-dedup/${encodeURIComponent(msgKey)}`);

  const cache = await caches.open('pawtrol-notif-dedup');
  const already = await cache.match(cacheKey);
  if (already) return; // already shown — skip

  // Mark as shown; expire after 30 minutes via a timestamp response
  const expiresAt = Date.now() + 30 * 60 * 1000;
  await cache.put(cacheKey, new Response(String(expiresAt)));

  // Prune expired entries so the cache doesn't grow forever
  const keys = await cache.keys();
  for (const key of keys) {
    const res = await cache.match(key);
    const exp = parseInt(await res.text(), 10);
    if (Date.now() > exp) cache.delete(key);
  }

  self.registration.showNotification(title || '🐾 Pawtrol', {
    body: body || 'דיווח חדש התקבל',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    data: { url },
  });
});

// Click on notification → focus existing window or open new one, then clear app badge
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/volunteer';
  event.waitUntil(
    (async () => {
      if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })()
  );
});
