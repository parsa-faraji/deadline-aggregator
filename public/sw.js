// Service Worker for push notifications and offline support
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Deadline Reminder";
  const options = {
    body: data.body || "You have an upcoming deadline!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "deadline-reminder",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/dashboard"));
});

// Cache strategy for offline support
const CACHE_NAME = "deadline-aggregator-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/dashboard", "/tasks", "/calendar", "/planner"]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Network first, fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
