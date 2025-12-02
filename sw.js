const CACHE_NAME = 'zenpomodoro-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './public/icon.svg'
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
  // Estrategia: Cache First, luego Network (y actualiza caché si es un recurso externo)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // Si no está en caché, lo pedimos a la red
        return fetch(event.request).then(
          function(response) {
            // Verificamos si la respuesta es válida
            if(!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            // Clonamos la respuesta para guardarla en caché si es JS o fuentes (CDN)
            if (event.request.url.includes('cdn') || event.request.url.includes('fonts')) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then(function(cache) {
                    cache.put(event.request, responseToCache);
                  });
            }

            return response;
          }
        );
      })
  );
});