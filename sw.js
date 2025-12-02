const CACHE_NAME = 'zenpomodoro-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './public/icon.svg',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './components/TimerDisplay.tsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          function(response) {
            if(!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            // Cache everything that comes from our domain or CDNs to ensure full offline support
            // This is critical for the PWA "installability" check
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});