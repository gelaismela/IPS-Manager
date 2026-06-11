Notifications — frontend integration

Overview
- Service worker: `public/service-worker.js` listens for `push` events and shows notifications using `title`, `body`, `icon`, `tag`, and `data` from the push payload.
- SW click routing: uses `data.type` (e.g., `delivery`, `material-request`, `admin`) and `data.deliveryId`/`data.requestId` to open the correct route.
- SW must be served from root (`/service-worker.js`) and app must run under HTTPS or `localhost`.
- Frontend subscribes with PushManager and POSTs the subscription JSON to `/push-notifications/subscribe` (see `src/api/api.js`).

Expected push payload (JSON)
- The backend should send a JSON string as the push message body. Example payloads below.

1) Delivery assignment (driver)
{
  "title": "🚚 New Delivery Assignment",
  "body": "You have a new delivery to Project X",
  "icon": "/logos/logo-light.png",
  "tag": "delivery-123",
  "data": {
    "type": "delivery",
    "deliveryId": 123,
    "url": "/deliveries/123"
  }
}

2) Material request created (head driver)
{
  "title": "🔔 New Material Request",
  "body": "Project Y requested 10 Cement",
  "data": {
    "type": "material-request",
    "requestId": 456,
    "url": "/material-requests/456"
  }
}

3) General admin notice
{
  "title": "📣 System Update",
  "body": "New batch report available",
  "data": {
    "type": "admin",
    "url": "/admin"
  }
}

Service worker behavior
- On `push`: SW parses JSON and calls `showNotification(title, options)`.
- On `notificationclick`: SW reads `event.notification.data` and attempts to focus an existing client or open the `url`/route derived from `data.type`.
- The SW also posts a `message` `{action: 'navigate', url}` to a focused client to let the SPA route internally.

Frontend subscription flow
- `NotificationSettings.js` and `PushNotificationSubscriber.js` already:
  - Request permission via `Notification.requestPermission()`.
  - Register/ready the service worker via `navigator.serviceWorker.register('/service-worker.js')`.
  - Subscribe via `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` and convert `subscription.toJSON()` to the server shape.
  - POST subscription JSON to `POST /push-notifications/subscribe` (authenticated via JWT). The expected body is:
    {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...,",
      "keys": { "p256dh": "...", "auth": "..." }
    }

Debugging & testing
1. Confirm mobile browser supports Push API (Android Chrome). iOS Safari may not support web push depending on OS/browser version.
2. Remote debug with Chrome: `chrome://inspect` → inspect device → open Console.
3. Check registration and subscription on device console:

```js
navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription().then(s => console.log(s)));
console.log(Notification.permission);
navigator.serviceWorker.getRegistration().then(r => console.log(r && r.scope));
```

4. Copy the subscription JSON and use a server-side `web-push` tool or the project's backend endpoint `/push-notifications/test` (if implemented) to send the example payloads.

Node test snippet (server-side)
```js
const webpush = require('web-push');
webpush.setVapidDetails('mailto:you@domain.tld', VAPID_PUBLIC, VAPID_PRIVATE);
await webpush.sendNotification(subscription, JSON.stringify(payload));
```

Notes
- `notificationService.show()` only displays notifications while the page is running (foreground). For background/closed mobile pushes, backend must send push messages to the stored subscription.
- Keep tags consistent (`delivery-{id}`) to dedupe on the OS level.

Files touched
- `public/service-worker.js` — click routing improvements
- `src/index.js` — earlier SW registration
- `src/components/PushNotificationSubscriber.js` and `src/components/NotificationSettings.js` — already implement subscription POST flow

If you want, I can:
- Add a minimal Node/Express sample endpoint that triggers a push using `web-push`.
- Run through remote debugging steps for your specific mobile device (tell me Android/iOS).