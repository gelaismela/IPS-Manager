# Complete Push Notification Implementation Guide

## Step 1: Add Dependencies to pom.xml

Add this to your `pom.xml` file:

```xml
<!-- Web Push Library for sending push notifications -->
<dependency>
    <groupId>nl.martijndwars</groupId>
    <artifactId>web-push</artifactId>
    <version>5.1.1</version>
</dependency>

<!-- Bouncycastle for encryption (required by web-push) -->
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.70</version>
</dependency>
```

---

## Step 2: Generate VAPID Keys

Run this Java code ONCE to generate your VAPID keys (add to a test class or main method):

```java
import nl.martijndwars.webpush.Utils;
import java.security.KeyPair;
import java.security.Security;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

public class VapidKeyGenerator {
    public static void main(String[] args) throws Exception {
        Security.addProvider(new BouncyCastleProvider());
        KeyPair keyPair = Utils.generateKeyPair();
        
        byte[] publicKey = Utils.savePublicKey(keyPair.getPublic());
        byte[] privateKey = Utils.savePrivateKey(keyPair.getPrivate());
        
        System.out.println("Public Key (Base64): " + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey));
        System.out.println("Private Key (Base64): " + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(privateKey));
    }
}
```

**Save these keys!** Add them to `application.properties`:

```properties
# Push Notification VAPID Keys
push.notification.public-key=YOUR_PUBLIC_KEY_HERE
push.notification.private-key=YOUR_PRIVATE_KEY_HERE
push.notification.subject=mailto:your-email@example.com
```

---

## Step 3: Create Entity, Repository, Service, and Controller

All files are provided below.

---

## Step 4: Test with Postman

Follow the original POSTMAN_NOTIFICATION_TESTS.md guide.

---

## Step 5: Test with Frontend

1. Run your React app
2. Login and enable notifications
3. Open browser console → Look for "✅ Subscribed to push notifications"
4. Create a material request from another browser/account
5. You should receive a real push notification!

---

## Troubleshooting

### Logs to Check:

**Success logs:**
```
🔔 Attempting to send notification to ROLE: HEAD_DRIVER
📧 NOTIFICATION TO USER: John (HEAD_DRIVER)
   Title: 🔔 New Material Request
   Body: Project ABC requested 100 x Cement
✅ Push notification sent successfully to subscription ID: 1
```

**Error logs:**
```
❌ Failed to send push to subscription 1: Invalid subscription
⚠️ Marking subscription 1 as inactive
```

### Common Issues:

1. **"Subscription not found"** → User hasn't enabled notifications in frontend
2. **"410 Gone"** → Subscription expired, will be marked inactive automatically
3. **"401 Unauthorized"** → VAPID keys are wrong, regenerate them

---

## Files Created:

1. `PushSubscription.java` (Entity)
2. `PushSubscriptionRepository.java` (Repository)
3. `PushNotificationService.java` (Service with logging)
4. `PushNotificationController.java` (REST API)
5. `PushSubscriptionDTO.java` (DTO)

Check the files below!
