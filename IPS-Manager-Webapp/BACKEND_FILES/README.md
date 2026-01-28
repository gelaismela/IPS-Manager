# Quick Setup Guide - Push Notifications with Console Logging

## ✅ What You Have Now:

All backend files are in the `BACKEND_FILES/` folder. The implementation includes:
- ✅ **Console logging** for debugging (you'll see all notification attempts)
- ✅ **Real push notifications** (works across browsers/devices)
- ✅ **Error handling** with detailed logs
- ✅ **Automatic cleanup** of invalid subscriptions

---

## 🚀 Step-by-Step Setup:

### 1. Add Dependencies to pom.xml

```xml
<!-- Web Push Library -->
<dependency>
    <groupId>nl.martijndwars</groupId>
    <artifactId>web-push</artifactId>
    <version>5.1.1</version>
</dependency>

<!-- Bouncycastle (required by web-push) -->
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.70</version>
</dependency>

<!-- Gson (for JSON) -->
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
</dependency>
```

### 2. Copy Backend Files

Copy all files from `BACKEND_FILES/` to your Spring Boot project:

```
BACKEND_FILES/
├── PushSubscription.java          → src/main/java/com/IPS/IPS_Manager/Entity/
├── PushSubscriptionRepository.java → src/main/java/com/IPS/IPS_Manager/Repository/
├── PushSubscriptionDTO.java       → src/main/java/com/IPS/IPS_Manager/DTO/
├── PushNotificationService.java   → src/main/java/com/IPS/IPS_Manager/Service/
├── PushNotificationController.java → src/main/java/com/IPS/IPS_Manager/Controller/
└── VapidKeyGenerator.java         → src/main/java/com/IPS/IPS_Manager/
```

### 3. Generate VAPID Keys

Run the VapidKeyGenerator:

```bash
# From your IDE, run VapidKeyGenerator.main()
# OR from terminal:
mvn exec:java -Dexec.mainClass="com.IPS.IPS_Manager.VapidKeyGenerator"
```

**Output will look like:**
```
🔑 Generating VAPID Keys...
✅ VAPID Keys Generated Successfully!

📋 Add these to your application.properties file:

push.notification.public-key=BN6w7V8Tx...
push.notification.private-key=qV9kHf2Pm...
push.notification.subject=mailto:your-email@example.com
```

### 4. Add Keys to application.properties

```properties
# Push Notification Configuration
push.notification.public-key=YOUR_PUBLIC_KEY_FROM_GENERATOR
push.notification.private-key=YOUR_PRIVATE_KEY_FROM_GENERATOR
push.notification.subject=mailto:your-email@example.com

# Enable logging for debugging
logging.level.com.IPS.IPS_Manager.Service.PushNotificationService=INFO
logging.level.com.IPS.IPS_Manager.Controller.PushNotificationController=INFO
```

### 5. Update Database

The `PushSubscription` table will be created automatically by JPA. If you need to create it manually:

```sql
CREATE TABLE push_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    endpoint VARCHAR(500) NOT NULL UNIQUE,
    p256dh TEXT,
    auth TEXT,
    subscribed_at DATETIME NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 6. Start Your Backend

```bash
mvn spring-boot:run
```

**Look for this log:**
```
✅ Push notification service initialized successfully
```

---

## 🧪 Testing:

### Test 1: Console Logs Only (No VAPID keys)

1. Start backend WITHOUT adding VAPID keys
2. Create a material request
3. **Check console** - you should see:
   ```
   📧 NOTIFICATION TO ROLE: HEAD_DRIVER
      Title: 🔔 New Material Request
      Body: Project ABC requested 100 x Cement
   ⚠️ Push service not initialized. Notification only logged to console.
   ```

### Test 2: Real Push Notifications (With VAPID keys)

1. Add VAPID keys to application.properties
2. Restart backend
3. In React app: Login → Enable notifications
4. **Check console:**
   ```
   📥 Received subscription request from user: John (PROJECT_MANAGER)
   📝 Subscribing user John (PROJECT_MANAGER) to push notifications
   ✅ New subscription created with ID: 1
   ```
5. Create material request from another account
6. **Check console:**
   ```
   🔔 Attempting to send notification to ROLE: HEAD_DRIVER
   📤 Sending to 1 subscription(s) with role HEAD_DRIVER
   ✅ Push notification sent successfully to Jane (subscription ID: 1)
   📊 Notification summary: 1 sent, 0 failed
   ```
7. **Check browser** - you should get real push notification! 🎉

---

## 📊 Console Log Examples:

### Success:
```
🔔 Attempting to send notification to ROLE: HEAD_DRIVER
   Title: 🔔 New Material Request
   Body: Project ABC requested 100 x Cement
   Data: {type=material_request_created, requestId=1, projectId=1}
📤 Sending to 2 subscription(s) with role HEAD_DRIVER
✅ Push notification sent successfully to Jane (subscription ID: 1)
✅ Push notification sent successfully to John (subscription ID: 3)
📊 Notification summary: 2 sent, 0 failed
```

### No Subscriptions:
```
🔔 Attempting to send notification to ROLE: HEAD_DRIVER
   Title: 🔔 New Material Request
⚠️ No active subscriptions found for role: HEAD_DRIVER
ℹ️ There are 3 user(s) with role HEAD_DRIVER but none have enabled push notifications
```

### Subscription Expired:
```
📤 Sending to 1 subscription(s)
❌ Failed to send push to John (subscription 5): 410 Gone
⚠️ Marking subscription 5 as inactive
📊 Notification summary: 0 sent, 1 failed
```

---

## 🎯 Next Steps:

1. ✅ Copy files from BACKEND_FILES/ to your project
2. ✅ Add dependencies to pom.xml
3. ✅ Run VapidKeyGenerator
4. ✅ Add VAPID keys to application.properties
5. ✅ Start backend and check logs
6. ✅ Test with Postman (see POSTMAN_NOTIFICATION_TESTS.md)
7. ✅ Test with frontend (enable notifications in React app)

---

## 🐛 Troubleshooting:

| Issue | Solution |
|-------|----------|
| "Cannot resolve PushSubscriptionRepository" | Make sure all files are in correct packages |
| "Push service not initialized" | Add VAPID keys to application.properties |
| "No active subscriptions" | Enable notifications in frontend first |
| "410 Gone" errors | Normal - subscription expired, will be marked inactive |
| "User not found" | Check that userRepo.findByMail() matches your JWT username field |

---

## 📝 What the Logs Tell You:

- **📧/🔔** = Attempting to send notification
- **✅** = Success
- **❌** = Error
- **⚠️** = Warning (subscription expired, not configured, etc.)
- **ℹ️** = Info (counts, summaries)
- **📊** = Summary statistics

You'll see EVERY notification attempt in the console, making debugging easy!
