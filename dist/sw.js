const CACHE_NAME = 'mocards-v1.0.0';
const STATIC_CACHE_NAME = 'mocards-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'mocards-dynamic-v1.0.0';

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache for offline usage
const CACHEABLE_APIS = [
  '/api/cards',
  '/api/clinics',
  '/api/analytics',
  '/api/security'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('mocards-')
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Different strategies for different types of requests
  if (request.destination === 'document') {
    // HTML pages - Network First with Cache Fallback
    event.respondWith(networkFirstWithCacheFallback(request));
  } else if (isStaticAsset(request)) {
    // Static assets - Cache First
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(request)) {
    // API requests - Network First with Cache Fallback
    event.respondWith(networkFirstForApi(request));
  } else {
    // Everything else - Network First
    event.respondWith(networkFirst(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  switch (event.tag) {
    case 'card-lookup':
      event.waitUntil(syncCardLookups());
      break;
    case 'analytics-update':
      event.waitUntil(syncAnalytics());
      break;
    case 'security-logs':
      event.waitUntil(syncSecurityLogs());
      break;
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: 'You have new updates in MOCARDS',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open MOCARDS',
        icon: '/icons/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(
    self.registration.showNotification('MOCARDS Cloud', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if MOCARDS is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window if not already open
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Caching Strategies
async function networkFirstWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page if available
    return caches.match('/offline.html') || new Response(
      'Offline - Please check your internet connection',
      { status: 503, statusText: 'Service Unavailable' }
    );
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', error);
    throw error;
  }
}

async function networkFirstForApi(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Add a header to indicate this is cached data
        const response = cachedResponse.clone();
        response.headers.set('X-Served-From', 'cache');
        return response;
      }
    }

    // For POST/PUT requests, queue for background sync
    if (request.method !== 'GET') {
      await queueForSync(request);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Request queued for when connection is restored',
          queued: true
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response(
      'Resource not available offline',
      { status: 503 }
    );
  }
}

// Utility functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i)
  );
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/api/') ||
    CACHEABLE_APIs.some(api => url.pathname.startsWith(api))
  );
}

async function queueForSync(request) {
  // Store request for background sync
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: await request.text(),
    timestamp: Date.now()
  };

  // In a real implementation, you'd store this in IndexedDB
  console.log('[SW] Queued for sync:', requestData);
}

async function syncCardLookups() {
  console.log('[SW] Syncing card lookups...');
  // Implement card lookup synchronization
}

async function syncAnalytics() {
  console.log('[SW] Syncing analytics...');
  // Implement analytics synchronization
}

async function syncSecurityLogs() {
  console.log('[SW] Syncing security logs...');
  // Implement security log synchronization
}

// Cleanup expired cache entries
async function cleanupExpiredCache() {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const requests = await cache.keys();
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');

    if (dateHeader) {
      const cacheDate = new Date(dateHeader).getTime();
      if (now - cacheDate > oneWeek) {
        await cache.delete(request);
        console.log('[SW] Cleaned up expired cache entry:', request.url);
      }
    }
  }
}

// Run cleanup periodically
setInterval(cleanupExpiredCache, 24 * 60 * 60 * 1000); // Daily cleanup