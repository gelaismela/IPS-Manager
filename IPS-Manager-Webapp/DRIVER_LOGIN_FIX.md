# Driver Login & Notification Fixes

## Issues Fixed

### 1. ✅ Driver Login Redirect

**Problem:** Driver login redirected to `/driver` but that route didn't exist, causing a 404.

**Solution:**

- Added `/driver` route in `App.js` that uses `DriverRedirect` component
- `DriverRedirect` fetches the driver's user ID and redirects to `/driver-deliveries/:id`
- Updated login flow in `Registration.js` to handle driver role specially
- Added `getCurrentUser()` API function to fetch user info including ID
- Stores `userId` in localStorage/sessionStorage for quick future access

**Flow:**

```
Login → Check if role === "driver" → Fetch user info → Get ID → Redirect to /driver-deliveries/{id}
```

### 2. ✅ Driver Browser Notifications

**Problem:** Drivers weren't getting browser notifications when assigned deliveries.

**Solution:**

- Integrated `useDeliveryNotifications` hook in `Diliveries.js` (driver's page)
- Added polling to fetch both deliveries and material requests every 30 seconds
- Notification service now tracks status changes and notifies drivers
- Drivers get notification when material request status changes to "ASSIGNED"

**Notification Triggers for Drivers:**

- 🚚 New delivery assignment (status: ASSIGNED)
- 🚛 Delivery status updates (IN_TRANSIT, DELIVERED, CANCELLED)

## New Files Created

### `src/components/DriverRedirect.js`

- Fetches current user's ID from backend
- Redirects to `/driver-deliveries/:id`
- Shows loading spinner during redirect
- Fallback to `/projects` if error occurs

## Modified Files

### `src/api/api.js`

- Added `getCurrentUser()` function to fetch logged-in user info

### `src/components/Registration.js`

- Special handling for driver role login
- Fetches user info to get driver ID
- Stores `userId` for future use
- Redirects to correct driver deliveries page

### `src/App.js`

- Added `/driver` route with DriverRedirect component
- Imported DriverRedirect component

### `src/components/Diliveries.js`

- Imported `useDeliveryNotifications` hook
- Added `getAllMaterialRequests` import
- Added state for `materialRequests`
- Integrated notification hook for browser alerts
- Added polling every 30 seconds to check for updates
- Fetches both deliveries and material requests

## How It Works Now

### Driver Login Flow

1. Driver logs in with email and password
2. Backend returns `{ token, role: "driver" }`
3. Frontend detects `role === "driver"`
4. Calls `GET /auth/me` to get user info including ID
5. Stores `userId` in storage
6. Redirects to `/driver-deliveries/:id`

### Driver Notifications

1. Driver opens their deliveries page
2. `useDeliveryNotifications` hook activates
3. Requests notification permission (once)
4. Polls deliveries and material requests every 30 seconds
5. Detects when a new delivery is assigned to them
6. Shows browser notification: "🚚 New Delivery Assignment"
7. Notification includes project name and material details

## Testing

### Test Driver Login

1. Login as driver (e.g., `driver@example.com`)
2. Should redirect to `/driver-deliveries/8` (or their ID)
3. URL should show correct driver ID
4. Page should load driver's deliveries

### Test Driver Notifications

1. Login as driver
2. Browser should request notification permission
3. Allow notifications
4. Admin/Head Driver assigns a delivery to this driver
5. Within 30 seconds, driver should receive browser notification
6. Notification should say "🚚 New Delivery Assignment"
7. Click notification to focus the app

## Backend Requirements

### ✅ Using Existing Endpoints

No new endpoints needed! The solution uses your existing:

1. **`GET /auth/users`** - Returns all users (filtered by email on frontend)
2. **`POST /auth/login`** - Returns `{ token, role }`

The frontend:

- Stores user's email during login
- Calls `GET /auth/users` to get all users
- Filters by email to find the logged-in user
- Extracts the user ID
- Redirects driver to `/driver-deliveries/:id`

### Optional Optimization

For better performance, you could add:

```java
@GetMapping("/users/by-email/{email}")
public ResponseEntity<Users> getUserByEmail(@PathVariable String email) {
    return ResponseEntity.ok(service.getUserByEmail(email));
}
```

But it works fine with the existing `/auth/users` endpoint!

## Notes

- Notification permission is requested after 2-second delay (not annoying)
- First load only initializes tracking (no false notifications)
- Status changes trigger notifications only once per change
- Works even when browser tab is in background
- Driver ID is cached in localStorage for instant redirects
