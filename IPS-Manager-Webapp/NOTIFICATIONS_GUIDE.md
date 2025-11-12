# Browser Push Notifications System

## Overview

This notification system provides real-time browser push notifications for delivery and material request status updates. Users receive notifications based on their role when relevant status changes occur.

## Features

### ✅ Automatic Notifications

- **Drivers**: Notified when assigned new deliveries
- **Project Managers**: Notified when drivers are assigned or deliveries complete
- **Head Drivers**: Notified of new material requests and delivery completions
- **All Users**: Status updates relevant to their role

### 🔔 Notification Types

#### Material Request Notifications

| Status    | Who Gets Notified            | Message                                                   |
| --------- | ---------------------------- | --------------------------------------------------------- |
| PENDING   | HEAD_DRIVER                  | "🔔 New Material Request: Project requested X materials"  |
| ASSIGNED  | DRIVER, PROJECT_MANAGER      | "✅ Driver Assigned: Driver assigned X materials"         |
| DELIVERED | PROJECT_MANAGER, HEAD_DRIVER | "📦 Delivery Completed: X materials delivered to Project" |

#### Delivery Notifications

| Status     | Who Gets Notified                   | Message                                                             |
| ---------- | ----------------------------------- | ------------------------------------------------------------------- |
| ASSIGNED   | DRIVER                              | "🚚 New Delivery Assignment: You have a new delivery to Project"    |
| IN_TRANSIT | PROJECT_MANAGER, HEAD_DRIVER        | "🚛 Delivery In Transit: Driver is on the way to Project"           |
| DELIVERED  | PROJECT_MANAGER, HEAD_DRIVER, ADMIN | "✅ Delivery Completed: Delivery to Project completed successfully" |
| CANCELLED  | DRIVER, PROJECT_MANAGER             | "❌ Delivery Cancelled: Delivery to Project has been cancelled"     |

## Architecture

### Core Components

1. **`notificationService.js`** - Main notification service

   - Handles browser notification permission
   - Manages notification display
   - Tracks status changes to prevent duplicate notifications
   - Role-based notification logic

2. **`useDeliveryNotifications.js`** - React hook

   - Automatically requests notification permission
   - Monitors deliveries and material requests
   - Triggers notifications on status changes
   - Initializes tracking to prevent false alerts

3. **`useMaterialRequestNotifications.js`** - Enhanced hook

   - Polls material requests every 30 seconds
   - Integrates browser push notifications
   - Manages unread count in notification bell

4. **`NotificationSettings.js`** - Settings UI
   - Shows notification permission status
   - Allows users to enable/test notifications
   - Provides troubleshooting steps

## Usage

### For Developers

#### Basic Integration (Automatic)

The notification system is automatically integrated into the material request polling:

```javascript
import { useMaterialRequestNotifications } from "../hooks/useMaterialRequestNotifications";

function MyComponent() {
  // Browser notifications are automatically enabled
  const { notifications, unreadCount } = useMaterialRequestNotifications({
    pollMs: 30000,
  });

  return (
    <div>
      <p>Unread: {unreadCount}</p>
    </div>
  );
}
```

#### Manual Integration for Custom Components

```javascript
import { useDeliveryNotifications } from "../hooks/useDeliveryNotifications";
import { getAllDeliveries, getAllMaterialRequests } from "../api/api";

function CustomComponent() {
  const [deliveries, setDeliveries] = useState([]);
  const [requests, setRequests] = useState([]);

  // Enable browser notifications for both
  useDeliveryNotifications(deliveries, requests, true);

  useEffect(() => {
    // Fetch data every 30 seconds
    const interval = setInterval(async () => {
      const newDeliveries = await getAllDeliveries();
      const newRequests = await getAllMaterialRequests();
      setDeliveries(newDeliveries);
      setRequests(newRequests);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return <div>Your component</div>;
}
```

#### Show Manual Notification

```javascript
import notificationService from "../services/notificationService";

// Show a custom notification
notificationService.show("Custom Title", {
  body: "Custom message",
  icon: "/custom-icon.png",
  tag: "unique-tag",
  onClick: () => {
    console.log("Notification clicked!");
  },
});
```

### For Users

1. **Enable Notifications**

   - Go to "Notifications" in the navigation menu
   - Click "Enable Notifications"
   - Allow notifications when prompted by the browser

2. **Test Notifications**

   - After enabling, click "Send Test Notification"
   - You should see a browser notification appear

3. **Troubleshooting**
   - If blocked, follow the on-screen instructions
   - Check browser notification settings
   - Ensure browser is up to date

## Browser Compatibility

| Browser | Version | Support          |
| ------- | ------- | ---------------- |
| Chrome  | 22+     | ✅ Full          |
| Firefox | 22+     | ✅ Full          |
| Safari  | 7+      | ✅ Full          |
| Edge    | 14+     | ✅ Full          |
| Opera   | 25+     | ✅ Full          |
| IE      | Any     | ❌ Not Supported |

## Security & Privacy

- Notifications require explicit user permission
- No personal data is stored
- Notification state is tracked locally (localStorage)
- Users can disable at any time

## API Endpoints Used

- `GET /material-requests/pending` - Polls for material request updates
- `GET /deliveries/all` - Polls for delivery updates (if implemented)

## Configuration

### Polling Interval

Default: 30 seconds (30000ms)

Change in component:

```javascript
useMaterialRequestNotifications({ pollMs: 60000 }); // 60 seconds
```

### Notification Auto-Close

Default: 5 seconds

Change in `notificationService.js`:

```javascript
setTimeout(() => {
  notification.close();
}, 10000); // 10 seconds
```

## Future Enhancements

- [ ] WebSocket support for real-time updates (no polling)
- [ ] Notification sound customization
- [ ] Notification history page
- [ ] Priority/urgent notification badges
- [ ] Desktop notification persistence
- [ ] Service Worker for offline notifications
- [ ] Click notification to navigate to specific delivery/request

## Debugging

Enable verbose logging:

```javascript
localStorage.setItem("DEBUG_NOTIFICATIONS", "true");
```

Check notification permission:

```javascript
console.log(Notification.permission); // "granted", "denied", or "default"
```

Test notification service:

```javascript
import notificationService from "./services/notificationService";
console.log(notificationService.isSupported()); // true/false
notificationService.show("Test", { body: "Testing..." });
```

## Notes

- First data load only initializes tracking (no notifications)
- Status changes are detected by comparing with previous state
- Duplicate notifications are prevented using unique tags
- Role-based filtering ensures users only see relevant notifications
- Works even when tab is in background (if browser allows)
