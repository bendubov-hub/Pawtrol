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

// onBackgroundMessage fires for data-only messages (when webpush.notification is absent).
// Since we now send webpush.notification, the browser displays the notification directly
// and onBackgroundMessage fires only if there's also a data payload with no notification.
// We use this purely as a safety net for any data-only fallback messages.
messaging.onBackgroundMessage(async payload => {
  // If there's a webpush notification, the browser already displayed it — skip.
  // We deduplicate via msgId so SW replays on restart don't re-show old notifications.
  const msgId = payload.data?.msgId;
  if (!msgId) return; // no msgId = browser already handled via webpush.notification

  const cacheKey = new Request(`https://pawtrol-notif-dedup/${encodeURIComponent(msgId)}`);
  const cache = await caches.open('pawtrol-notif-dedup');
  if (await cache.match(cacheKey)) return; // already shown

  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  await cache.put(cacheKey, new Response(String(expiresAt)));

  // Prune expired entries
  const keys = await cache.keys();
  for (const key of keys) {
    const res = await cache.match(key);
    const exp = parseInt(await res.text(), 10);
    if (Date.now() > exp) cache.delete(key);
  }

  const { title, body, icon, url } = payload.data || {};
  self.registration.showNotification(title || '🐾 Pawtrol', {
    body: body || 'דיווח חדש התקבל',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    data: { url },
  });
});

// Click on notification → navigate and clear app badge
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
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
