/**
 * Service Worker for PWA Features
 * Handles offline caching, background sync, and app installation
 */

const CACHE_NAME = 'pantry-ai-v1';
const STATIC_CACHE = 'pantry-ai-static-v1';
const DATA_CACHE = 'pantry-ai-data-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/output.css',
  '/js/app.js',
  '/js/data/dataManager.js',
  '/js/core/appState.js',
  '/js/utils/logger.js',
  '/js/utils/sanitizer.js',
  '/js/config/environment.js',
  '/js/security/csp.js',
  '/js/monitoring/errorTracker.js',
  '/js/ui/errorBoundary.js',
  '/js/utils/offlineManager.js',
  '/js/accessibility/accessibilityManager.js',
  '/data/recipes_enhanced.json',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DATA_CACHE && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Old caches cleaned');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    // Static assets - serve from cache, network fallback
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            })
            .catch(() => {
              // Return offline fallback for HTML
              if (request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
              }
            });
        })
    );
  } else if (url.pathname.includes('/data/') || url.pathname.includes('.json')) {
    // Data requests - network first, cache fallback
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  } else {
    // Other requests - network only
    event.respondWith(fetch(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Get all clients and trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      });
    });
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: 'You have new meal suggestions ready!',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Suggestions',
        icon: '/images/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Pantry AI', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open or focus the app
    event.waitUntil(
      clients.openWindow('/')
        .then((client) => {
          if (client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action: event.action,
              data: event.notification.data
            });
          }
        })
    );
  }
});

// Message handling from main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_UPDATE':
      updateCache(data);
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION_RESPONSE',
        version: CACHE_NAME
      });
      break;
  }
});

async function updateCache(data) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    
    // Update specific files if provided
    if (data.files) {
      await Promise.all(
        data.files.map(file => cache.add(file))
      );
    }
    
    console.log('Service Worker: Cache updated');
  } catch (error) {
    console.error('Service Worker: Cache update failed', error);
  }
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'sync-data') {
      event.waitUntil(syncData());
    }
  });
}

async function syncData() {
  try {
    // Sync data with server
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: Date.now(),
        action: 'periodic_sync'
      })
    });
    
    if (response.ok) {
      console.log('Service Worker: Periodic sync completed');
    }
  } catch (error) {
    console.error('Service Worker: Periodic sync failed', error);
  }
}

// Cache cleanup helper
async function cleanupCache() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name !== STATIC_CACHE && 
    name !== DATA_CACHE && 
    name !== CACHE_NAME
  );
  
  await Promise.all(
    oldCaches.map(name => caches.delete(name))
  );
}

// Network status helper
function isOnline() {
  return self.navigator.onLine;
}

// Service worker lifecycle helpers
self.addEventListener('controllerchange', () => {
  console.log('Service Worker: Controller changed');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CACHE_NAME,
    STATIC_CACHE,
    DATA_CACHE,
    cleanupCache,
    isOnline
  };
}
