const CACHE_NAME = 'zenpomodoro-v9-fix';
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
  // Navigation Fallback ROBUSTO (Offline-First para HTML):
  // Si es una navegación (abrir la app), SIEMPRE servimos index.html del caché.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', {ignoreSearch: true}).then((response) => {
        return response || fetch(event.request);
      }).catch(() => {
        // Si falla todo (offline total), devolvemos el index.html cacheado
        return caches.match('./index.html', {ignoreSearch: true});
      })
    );
    return;
  }

  // Estrategia Stale-While-Revalidate / Cache First modificada
  event.respondWith(
    caches.match(event.request, {ignoreSearch: true})
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(
          function(response) {
            // CORRECCIÓN IMPORTANTE:
            // Permitimos caching de 'basic' (mismo origen) Y 'cors' (Tailwind/Fuentes/Iconos externos)
            // Antes se bloqueaba 'cors', impidiendo que Tailwind funcionara offline.
            if(!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
            // Si falla el fetch de un recurso y no está en caché, no podemos hacer mucho más que fallar silenciosamente o devolver un placeholder
            console.log('Fetch failed:', err);
        });
      })
  );
});