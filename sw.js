// Big Bang Arcade service worker: shows boss alerts sent by the arcade. It does not cache or change any page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Big Bang Arcade', { body: d.body || 'Something is happening in the arcade.', icon: '/assets/icon-192.png', badge: '/assets/icon-192.png', tag: d.tag || 'bba', renotify: true, data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const c of list) if (new URL(c.url).origin === self.location.origin && 'focus' in c) return c.focus(); return self.clients.openWindow(url); }));
});
