const CACHE_VERSION = "v2"; // Змінюйте при оновленні кешованих файлів
const STATIC_CACHE_NAME = `hotel-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `hotel-dynamic-${CACHE_VERSION}`;

// Ресурси, що складають "App Shell" - кешуються при інсталяції
const APP_SHELL_URLS = [
  "/hotel_reservation/index.php", // Головна сторінка
  "/hotel_reservation/manifest.json",
  "/hotel_reservation/css/style.css",
  "/hotel_reservation/offline.html", // Офлайн-сторінка
  // Ваші іконки (принаймні основні)
  "/hotel_reservation/images/icons/icon-192x192.png",
  "/hotel_reservation/images/icons/icon-512x512.png",
  // Локальні JS бібліотеки, якщо не CDN. CDN кешуватимемо динамічно.
];

// Обмеження розміру динамічного кешу (кількість записів)
const MAX_DYNAMIC_CACHE_SIZE = 50;

function limitCacheSize(cacheName, size) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, size));
      }
    });
  });
}

self.addEventListener("install", (event) => {
  console.log(`[Service Worker ${CACHE_VERSION}] Install`);
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log(`[Service Worker ${CACHE_VERSION}] Caching App Shell`);
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch((error) => {
        console.error(
          `[Service Worker ${CACHE_VERSION}] App Shell Caching Failed:`,
          error
        );
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log(`[Service Worker ${CACHE_VERSION}] Activate`);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(
            (key) => key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim(); // Дозволяє активному SW взяти контроль над сторінками одразу
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Стратегія для API GET-запитів (Network first, then Cache)
  // Перевіряємо, чи URL запиту містить '/api/' і це GET-запит
  if (requestUrl.pathname.includes("/api/") && event.request.method === "GET") {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
              limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
            }
            return networkResponse;
          })
          .catch(() => {
            // Якщо мережа недоступна, спробувати взяти з кешу
            return cache.match(event.request).then((cachedResponse) => {
              return (
                cachedResponse ||
                new Response(
                  JSON.stringify({
                    error:
                      "Offline, data from cache might be outdated or unavailable.",
                  }),
                  {
                    headers: { "Content-Type": "application/json" },
                    status: 503,
                  }
                )
              );
            });
          });
      })
    );
    return;
  }

  // 2. Стратегія для CDN ресурсів (Cache first, then Network, and update cache)
  if (
    requestUrl.hostname === "code.jquery.com" ||
    requestUrl.hostname === "cdn.jsdelivr.net"
  ) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
              limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
            }
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Якщо ресурс є в кеші - повернути його
      if (cachedResponse) {
        return cachedResponse;
      }
      // Якщо ресурсу немає в кеші - спробувати завантажити з мережі
      return fetch(event.request)
        .then((networkResponse) => {
          // Для GET запитів, якщо успішно, кешуємо в динамічний кеш
          if (event.request.method === "GET" && networkResponse.ok) {
            return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
              return networkResponse;
            });
          }
          return networkResponse; // Для POST і т.д., або якщо не ok
        })
        .catch(() => {
          // Якщо це навігаційний запит (на HTML сторінку) і мережа недоступна
          if (event.request.mode === "navigate") {
            return caches.match("/hotel_reservation/offline.html");
          }
          // Для інших типів запитів (зображення, css, js, які не були в App Shell),
          // можна повернути стандартну помилку або порожню відповідь.
        });
    })
  );
});
