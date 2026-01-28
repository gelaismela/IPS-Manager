# Postman Testing Guide for Push Notifications

## Setup

1. **Login First** to get JWT token:
   ```
   POST http://localhost:8080/auth/login
   Content-Type: application/json
   
   {
     "mail": "your-email@example.com",
     "password": "your-password"
   }
   ```
   
   **Copy the `token` from response** - you'll need it for all other requests.

2. **Set Authorization Header** for all subsequent requests:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN_HERE
   ```

---

## Test 1: Create Material Request (Notifies HEAD_DRIVER)

**Endpoint:**
```
POST http://localhost:8080/api/material-requests/create
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "projectId": 1,
  "materialId": "CEMENT",
  "requestedQuantity": 100
}
```

**Expected Log Output:**
```
📧 NOTIFICATION TO ROLE: HEAD_DRIVER
   Title: 🔔 New Material Request
   Body: Project ABC requested 100 x Cement
   Data: {type=material_request_created, requestId=1, projectId=1}
```

---

## Test 2: Assign Driver to Request (Notifies DRIVER + PROJECT_MANAGER)

**Endpoint:**
```
POST http://localhost:8080/api/material-requests/{requestId}/assign
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "driverId": 5,
  "assignedQuantity": 100,
  "deliveryDate": "2025-12-30"
}
```

**Expected Log Output:**
```
📧 NOTIFICATION TO USER: John Driver (DRIVER)
   Title: 🚚 New Delivery Assignment
   Body: You've been assigned to deliver 100 x Cement to Project ABC

📧 NOTIFICATION TO USER: Jane Manager (PROJECT_MANAGER)
   Title: ✅ Driver Assigned
   Body: Driver John Driver assigned to deliver Cement
```

---

## Test 3: Mark Delivery as Completed (Notifies PROJECT_MANAGER + HEAD_DRIVER)

**Endpoint:**
```
PUT http://localhost:8080/api/deliveries/{assignmentId}/status
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "SENT"
}
```

**Expected Log Output:**
```
📧 NOTIFICATION TO USER: Jane Manager (PROJECT_MANAGER)
   Title: ✅ Delivery Completed
   Body: Driver John delivered 100 x Cement

📧 NOTIFICATION TO ROLE: HEAD_DRIVER
   Title: 📦 Delivery Completed
   Body: Delivery to Project ABC completed
```

---

## Test 4: Test Notification Endpoint (Direct Test)

**Endpoint:**
```
POST http://localhost:8080/api/notifications/test
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Log Output:**
```
📧 NOTIFICATION TO USER: Your Name (YOUR_ROLE)
   Title: 🧪 Test Notification
   Body: This is a test push notification!
   Data: {type=test}
```

---

## Common Issues & Solutions

### ❌ Error: "Cannot resolve PushNotificationService"
**Solution:** Make sure you created the `PushNotificationService.java` file with the logging implementation:

```java
@Service
@Slf4j
public class PushNotificationService {
    
    @Autowired
    private UserRepo userRepo;
    
    public void sendToUser(Users user, String title, String body, Map<String, String> data) {
        log.info("📧 NOTIFICATION TO USER: {} ({})", user.getName(), user.getRole());
        log.info("   Title: {}", title);
        log.info("   Body: {}", body);
        log.info("   Data: {}", data);
    }
    
    public void sendToRole(String role, String title, String body, Map<String, String> data) {
        log.info("📧 NOTIFICATION TO ROLE: {}", role);
        log.info("   Title: {}", title);
        log.info("   Body: {}", body);
        log.info("   Data: {}", data);
    }
}
```

### ❌ Error: "Project.projectManager is null"
**Solution:** The notification code checks `if (project.getProjectManager() != null)` before sending, so this shouldn't crash. But make sure your Project entity has a project manager assigned.

### ❌ No logs appearing
**Solution:** 
1. Make sure logging is enabled in `application.properties`:
   ```properties
   logging.level.com.IPS.IPS_Manager.Service=INFO
   ```
2. Check your console/terminal where Spring Boot is running

---

## Quick Test Checklist

- [ ] Created `PushNotificationService.java` with logging
- [ ] Added service to `MaterialRequestService` and `DeliveryAssignmentService`
- [ ] Spring Boot is running without errors
- [ ] Logged in via Postman and got JWT token
- [ ] Created material request → See HEAD_DRIVER notification log
- [ ] Assigned driver → See DRIVER notification log
- [ ] Marked delivery as SENT → See PROJECT_MANAGER notification log

---

## Next Steps

Once logs are working correctly:
1. ✅ Backend notification triggers are working
2. ⏭️ Implement actual push notification sending (Web Push or Firebase)
3. ⏭️ Test with real push notifications from frontend

Your backend is ready! The frontend code has also been added to handle real push notifications.
