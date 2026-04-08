// sw.js — R.R Builders Ltd. Service Worker
// Handles push notifications and offline caching

const CACHE='rrbuilders-v2';
const OFFLINE_URLS=[
  '/RR-Builders-Ltd/tablet.html',
  '/RR-Builders-Ltd/tablet-login.html',
];

// ── INSTALL: cache key pages ──────────────────────────────────
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────────
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: serve from cache when offline ─────────────────────
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request))
  );
});

// ── PUSH: show notification ───────────────────────────────────
self.addEventListener('push',e=>{
  let payload={title:'R.R Builders',body:'You have a new notification.',icon:'/RR-Builders-Ltd/icons/icon-192.png',badge:'/RR-Builders-Ltd/icons/icon-192.png',tag:'rrbuilders',data:{url:'/RR-Builders-Ltd/tablet.html'}};

  if(e.data){
    try{
      const d=e.data.json();
      payload={...payload,...d};
    }catch{
      payload.body=e.data.text()||payload.body;
    }
  }

  // Make the notification impossible to miss
  const options={
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag||'rrbuilders',
    data: payload.data||{url:'/RR-Builders-Ltd/tablet.html'},
    requireInteraction: true,   // stays on screen until tapped — doesn't auto-dismiss
    vibrate: [300,100,300,100,600], // long vibration pattern
    silent: false,
    actions:[
      {action:'open', title:'Open App'},
      {action:'dismiss', title:'Dismiss'}
    ]
  };

  e.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener('notificationclick',e=>{
  e.notification.close();

  if(e.action==='dismiss')return;

  const url=e.notification.data?.url||'/RR-Builders-Ltd/tablet.html';

  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(windowClients=>{
      // If app is already open, focus it
      for(const client of windowClients){
        if(client.url.includes('tablet.html')&&'focus' in client){
          return client.focus();
        }
      }
      // Otherwise open a new window
      if(clients.openWindow)return clients.openWindow(url);
    })
  );
});

// ── PUSH SUBSCRIPTION CHANGE ──────────────────────────────────
self.addEventListener('pushsubscriptionchange',e=>{
  e.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:e.oldSubscription.options.applicationServerKey
    }).then(sub=>{
      // Post new subscription back to the page
      return self.clients.matchAll().then(clients=>{
        clients.forEach(c=>c.postMessage({type:'PUSH_SUBSCRIPTION_CHANGED',subscription:sub}));
      });
    })
  );
});
