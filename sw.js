const CACHE_NAME = 'zenpomodoro-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './public/icon.svg',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './components/TimerDisplay.tsx',
  // Cache external resources required for initial render
  'https://cdn.tailwindcss.com', 
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
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
            // Basic validity check
            if(!response || response.status !== 200) {
              return response;
            }

            // Important: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Cache everything allowed (including cors/opaque if necessary for some resources)
                // We use put here to cache dynamic requests
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
            // Fallback for offline if not found in cache
            // (Optional: could return a custom offline page here)
        });
      })
  );
});