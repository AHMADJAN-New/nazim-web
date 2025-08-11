const CACHE_NAME = 'gvs-portal-v1.0.0';
const API_CACHE_NAME = 'gvs-api-v1.0.0';
const IMAGE_CACHE_NAME = 'gvs-images-v1.0.0';

// Define what to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/index.html',
  // Add critical CSS and JS files here
];

const API_ENDPOINTS = [
  '/api/dashboard-stats',
  '/api/user-profile',
  '/api/recent-activities',
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] API cache ready');
        return cache;
      }),
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Image cache ready');
        return cache;
      })
    ]).then(() => {
      console.log('[ServiceWorker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // API requests - Network First with offline fallback
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
      return await networkFirstStrategy(request, API_CACHE_NAME);
    }
    
    // Images - Cache First
    if (request.destination === 'image') {
      return await cacheFirstStrategy(request, IMAGE_CACHE_NAME);
    }
    
    // Static assets - Cache First
    if (url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.woff') || 
        url.pathname.endsWith('.woff2')) {
      return await cacheFirstStrategy(request, CACHE_NAME);
    }
    
    // HTML pages - Network First
    if (request.destination === 'document' || url.pathname === '/') {
      return await networkFirstWithOfflinePage(request);
    }
    
    // Default to network
    return await fetch(request);
    
  } catch (error) {
    console.error('[ServiceWorker] Request failed:', error);
    return await getOfflineResponse(request);
  }
}

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[ServiceWorker] Cache hit:', request.url);
    return cachedResponse;
  }
  
  console.log('[ServiceWorker] Cache miss:', request.url);
  const networkResponse = await fetch(request);
  
  // Cache successful responses
  if (networkResponse.status === 200) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First Strategy
async function networkFirstStrategy(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  
  try {
    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    console.log('[ServiceWorker] Network success:', request.url);
    return networkResponse;
    
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network First with Offline Page for HTML requests
async function networkFirstWithOfflinePage(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return getOfflineResponse(request);
  }
}

// Offline response
async function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  // For HTML requests, return offline page
  if (request.destination === 'document') {
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GVS Portal - Offline</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #1976d2, #42a5f5);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container {
            max-width: 400px;
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 1rem;
            backdrop-filter: blur(10px);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 { margin: 0 0 1rem 0; }
          p { margin: 0 0 1.5rem 0; opacity: 0.9; }
          button {
            background: white;
            color: #1976d2;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
          }
          button:hover { transform: translateY(-2px); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📚</div>
          <h1>You're Offline</h1>
          <p>GVS Portal needs an internet connection to work properly. Please check your connection and try again.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
  
  // For API requests, return offline data structure
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'This content is not available offline',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  // Default offline response
  return new Response('Offline', { status: 503 });
}

// Background Sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[ServiceWorker] Performing background sync');
  
  try {
    // Get failed requests from IndexedDB
    const failedRequests = await getFailedRequests();
    
    for (const request of failedRequests) {
      try {
        await fetch(request.url, request.options);
        await removeFailedRequest(request.id);
        console.log('[ServiceWorker] Synced:', request.url);
      } catch (error) {
        console.log('[ServiceWorker] Sync failed:', request.url, error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync error:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: 'You have new updates in GVS Portal',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Portal',
        icon: '/icons/action-explore.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png',
      },
    ],
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'GVS Portal';
  }
  
  event.waitUntil(
    self.registration.showNotification('GVS Portal', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
    }
  }
});

// Utility functions
async function getFailedRequests() {
  // In a real implementation, you'd use IndexedDB
  return [];
}

async function removeFailedRequest(id) {
  // In a real implementation, you'd remove from IndexedDB
  return true;
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

console.log('[ServiceWorker] Service Worker loaded');