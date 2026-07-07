const CACHE_NAME = 'zerog-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/zerog.css',
  '/js/main.js',
  '/js/lock.js',
  '/js/dashboard.js',
  '/js/predictor.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap'
];

// Instalação do Service Worker e cacheamento dos assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ZERO-G SW] Fazendo cache dos assets...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ZERO-G SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia Cache-First: tenta o cache, se falhar vai para a rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        // Não salva requisições externas no cache (exceto fonts do Google)
        if (event.request.url.startsWith(self.location.origin) || event.request.url.includes('fonts.gstatic.com')) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        }
        return response;
      });
    })
  );
});
