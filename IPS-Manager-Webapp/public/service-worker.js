// Service Worker for Push Notifications

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(self.clients.claim());
});

// Listen for push notifications
self.addEventListener("push", (event) => {
  console.log("📬 Push notification received:", event);

  let notificationData;

  try {
    if (event.data) {
      const text = event.data.text();
      console.log("📄 Raw push data:", text);
      notificationData = JSON.parse(text);
      console.log("📦 Parsed notification data:", notificationData);
    } else {
      console.warn("⚠️ Push event has no data");
      notificationData = {
        title: "New Notification",
        body: "You have a new update",
      };
    }
  } catch (error) {
    console.error("❌ Error parsing push data:", error);
    notificationData = {
      title: "New Notification",
      body: "You have a new update",
    };
  }

  const title = notificationData.title || "IPS Manager";
  const options = {
    body: notificationData.body || "You have a new notification",
    icon: notificationData.icon || "/logos/logo-light.png",
    badge: notificationData.badge || "/favicon.ico",
    data: notificationData.data || {},
    vibrate: [200, 100, 200],
    tag: notificationData.tag || "default-notification",
    requireInteraction: false,
    actions: notificationData.actions || [],
  };

  console.log("🔔 Showing notification:", title, options);

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log("✅ Notification displayed successfully");
      })
      .catch((error) => {
        console.error("❌ Failed to show notification:", error);
      })
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  // Determine target URL from notification data
  const data = event.notification.data || {};
  const type = data.type || (data.payload && data.payload.type);

  let targetUrl = "/";

  try {
    if (type === "delivery") {
      if (data.deliveryId) targetUrl = `/delivery/${data.deliveryId}`;
      else targetUrl = "/deliveryRequests";
    } else if (type === "material-request" || type === "mr") {
      targetUrl = "/deliveryRequests";
      if (data.requestId) {
        // Keep default list route if there is no dedicated individual request page
        targetUrl = "/deliveryRequests";
      }
    } else if (type === "driver") {
      targetUrl = "/driver-deliveries";
    } else if (type === "admin") {
      targetUrl = "/admin";
    } else if (type === "project") {
      if (data.projectId) targetUrl = `/project/${data.projectId}`;
      else targetUrl = "/projects";
    } else if (data.url) {
      targetUrl = data.url;
    }
  } catch (e) {
    targetUrl = "/";
  }

  // Open or focus the app and navigate to the target URL
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            // If a window is already open, focus it and post a message with navigation
            if (client.url.includes(self.location.origin) && "focus" in client) {
              client.focus();
              // send message to client to change route if it supports messaging
              try {
                client.postMessage({ action: "navigate", url: targetUrl });
              } catch (e) {}
              return client.focus();
            }
          } catch (e) {
            // ignore cross-origin client failures
          }
        }
        // Otherwise, open a new window at the target URL
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle push subscription change
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log(
    "⚠️ Push subscription changed - user needs to re-login to resubscribe"
  );
  // Note: Automatic resubscription is handled by the app when user logs in
  // We can't access the VAPID key here since it's fetched from backend
});
