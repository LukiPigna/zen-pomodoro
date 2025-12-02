const CACHE_NAME = 'zenpomodoro-v8';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './public/icon-192.png',
  './public/icon-512.png',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './components/TimerDisplay.tsx',
  './components/VisualTimer.tsx',
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
  // Navigation Fallback ROBUSTO:
  // Si es una navegación (abrir la app), SIEMPRE intentamos servir index.html del caché.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(event.request);
      }).catch(() => {
        // Si falla todo, intentamos devolver el index.html cacheado como último recurso
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Estrategia Cache First para assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          function(response) {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

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