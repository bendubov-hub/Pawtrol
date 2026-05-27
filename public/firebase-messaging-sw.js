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

// Background message handler
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || '🐾 Pawtrol', {
    body: body || 'דיווח חדש התקבל',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    data: payload.data,
  });
});

// Click on notification → focus existing window or open new one
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/volunteer';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
