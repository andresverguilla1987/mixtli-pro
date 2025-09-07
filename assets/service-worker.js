
self.addEventListener('install', (e)=>{ self.skipWaiting(); });
self.addEventListener('activate', (e)=>{ self.clients.claim(); });
self.addEventListener('push', (e)=>{
  const data = e.data ? e.data.json() : { title:'Mixtli', text:'Notificación' };
  e.waitUntil(self.registration.showNotification(data.title || 'Mixtli', {
    body: data.text || 'Mensaje',
    data: { url: data.url || '/admin.html' }
  }));
});
self.addEventListener('notificationclick', (e)=>{
  e.notification.close();
  const url = e.notification.data?.url || '/admin.html';
  e.waitUntil(clients.matchAll({ type:'window' }).then(list => {
    for (const c of list){ if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
