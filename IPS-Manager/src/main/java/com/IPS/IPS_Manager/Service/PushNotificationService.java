package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.DTO.PushSubscriptionDTO;
import com.IPS.IPS_Manager.Entity.PushSubscription;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.PushSubscriptionRepository;
import com.IPS.IPS_Manager.Repository.UserRepo;
import com.google.gson.Gson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Security;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final PushSubscriptionRepository subscriptionRepo;
    private final UserRepo userRepo;

    @Value("${push.notification.public-key:}")
    private String publicKey;

    @Value("${push.notification.private-key:}")
    private String privateKey;

    @Value("${push.notification.subject:mailto:admin@example.com}")
    private String subject;

    private PushService pushService;

    @PostConstruct
    public void init() {
        try {
            Security.addProvider(new BouncyCastleProvider());

            if (publicKey != null && !publicKey.isEmpty() && privateKey != null && !privateKey.isEmpty()) {
                pushService = new PushService();
                pushService.setPublicKey(publicKey);
                pushService.setPrivateKey(privateKey);
                pushService.setSubject(subject);
                log.info("✅ Push notification service initialized successfully");
                log.info("ℹ️ Using VAPID keys from application.properties");
            } else {
                log.warn("⚠️ VAPID keys not configured. Push notifications will only log to console.");
                log.warn("⚠️ Auto-generating VAPID keys for development...");
                generateAndDisplayKeys();
            }
        } catch (Exception e) {
            log.error("❌ Failed to initialize push service: {}", e.getMessage());
        }
    }

    private void generateAndDisplayKeys() {
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("EC");
            ECGenParameterSpec ecSpec = new ECGenParameterSpec("secp256r1");
            keyPairGenerator.initialize(ecSpec, new SecureRandom());
            KeyPair keyPair = keyPairGenerator.generateKeyPair();

            ECPublicKey pubKey = (ECPublicKey) keyPair.getPublic();
            ECPrivateKey privKey = (ECPrivateKey) keyPair.getPrivate();

            byte[] publicKeyBytes = encodePublicKey(pubKey);
            byte[] privateKeyBytes = privKey.getS().toByteArray();

            if (privateKeyBytes.length < 32) {
                byte[] padded = new byte[32];
                System.arraycopy(privateKeyBytes, 0, padded, 32 - privateKeyBytes.length, privateKeyBytes.length);
                privateKeyBytes = padded;
            } else if (privateKeyBytes.length > 32) {
                byte[] trimmed = new byte[32];
                System.arraycopy(privateKeyBytes, privateKeyBytes.length - 32, trimmed, 0, 32);
                privateKeyBytes = trimmed;
            }

            String publicKeyBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKeyBytes);
            String privateKeyBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(privateKeyBytes);

            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.warn("🔑 VAPID KEYS AUTO-GENERATED FOR DEVELOPMENT");
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.warn("push.notification.public-key={}", publicKeyBase64);
            log.warn("push.notification.private-key={}", privateKeyBase64);
            log.warn("push.notification.subject=mailto:your-email@example.com");
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            pushService = new PushService();
            pushService.setPublicKey(publicKeyBase64);
            pushService.setPrivateKey(privateKeyBase64);
            pushService.setSubject(subject);

            log.info("✅ Using auto-generated VAPID keys for this session");

        } catch (Exception e) {
            log.error("❌ Failed to generate VAPID keys: {}", e.getMessage());
        }
    }

    private byte[] encodePublicKey(ECPublicKey publicKey) {
        byte[] x = publicKey.getW().getAffineX().toByteArray();
        byte[] y = publicKey.getW().getAffineY().toByteArray();

        byte[] xBytes = padOrTrim(x, 32);
        byte[] yBytes = padOrTrim(y, 32);

        byte[] encoded = new byte[65];
        encoded[0] = 0x04;
        System.arraycopy(xBytes, 0, encoded, 1, 32);
        System.arraycopy(yBytes, 0, encoded, 33, 32);

        return encoded;
    }

    private byte[] padOrTrim(byte[] input, int length) {
        if (input.length == length) {
            return input;
        } else if (input.length > length) {
            byte[] trimmed = new byte[length];
            System.arraycopy(input, input.length - length, trimmed, 0, length);
            return trimmed;
        } else {
            byte[] padded = new byte[length];
            System.arraycopy(input, 0, padded, length - input.length, input.length);
            return padded;
        }
    }

    public PushSubscription subscribe(Users user, PushSubscriptionDTO dto) {
        // ✅ FIXED: Log user roles string cleanly out of the Set
        log.info("📝 Subscribing user {} ({}) to push notifications", user.getName(), user.getRoles());

        Optional<PushSubscription> existing = subscriptionRepo.findByEndpoint(dto.getEndpoint());

        if (existing.isPresent()) {
            PushSubscription sub = existing.get();
            sub.setUser(user);
            sub.setActive(true);
            sub.setLastUsed(LocalDateTime.now());
            log.info("♻️ Reactivated existing subscription ID: {}", sub.getId());
            return subscriptionRepo.save(sub);
        }

        PushSubscription subscription = new PushSubscription();
        subscription.setUser(user);
        subscription.setEndpoint(dto.getEndpoint());
        subscription.setP256dh(dto.getKeys().getP256dh());
        subscription.setAuth(dto.getKeys().getAuth());
        subscription.setSubscribedAt(LocalDateTime.now());
        subscription.setLastUsed(LocalDateTime.now());
        subscription.setActive(true);

        PushSubscription saved = subscriptionRepo.save(subscription);
        log.info("✅ New subscription created with ID: {}", saved.getId());

        return saved;
    }

    public void sendToUser(Users user, String title, String body, Map<String, String> data) {
        // ✅ FIXED: Updated log context
        log.info("📧 NOTIFICATION TO USER: {} ({})", user.getName(), user.getRoles());
        log.info("   Title: {}", title);
        log.info("   Body: {}", body);
        log.info("   Data: {}", data);

        List<PushSubscription> subscriptions = subscriptionRepo.findByUserAndActiveTrue(user);

        if (subscriptions.isEmpty()) {
            log.warn("⚠️ No active subscriptions found for user: {}", user.getName());
            return;
        }

        log.info("📤 Sending to {} subscription(s)", subscriptions.size());

        for (PushSubscription sub : subscriptions) {
            try {
                sendPushNotification(sub, title, body, data);
                sub.setLastUsed(LocalDateTime.now());
                subscriptionRepo.save(sub);
                log.info("✅ Push notification sent successfully to subscription ID: {}", sub.getId());
            } catch (Exception e) {
                log.error("❌ Failed to send push to subscription {}: {}", sub.getId(), e.getMessage());

                if (e.getMessage().contains("410") || e.getMessage().contains("Gone")) {
                    sub.setActive(false);
                    subscriptionRepo.save(sub);
                    log.warn("⚠️ Marking subscription {} as inactive (endpoint no longer valid)", sub.getId());
                }
            }
        }
    }

    /**
     * Send notification to all users with specific role
     * ✅ FIXED: Updated to cross-reference multiple roles cleanly using Streams
     */
    public void sendToRole(String role, String title, String body, Map<String, String> data) {
        log.info("🔔 Attempting to send notification to ROLE: {}", role);
        log.info("   Title: {}", title);
        log.info("   Body: {}", body);
        log.info("   Data: {}", data);

        // Fetch all active subscriptions and filter programmatically by checking inside the user's role set
        List<PushSubscription> subscriptions = subscriptionRepo.findAll().stream()
                .filter(sub -> sub.isActive() && sub.getUser() != null && sub.getUser().getRoles() != null)
                .filter(sub -> sub.getUser().getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(role)))
                .toList();

        if (subscriptions.isEmpty()) {
            log.warn("⚠️ No active subscriptions found for role: {}", role);

            // Fetch all users to see if anyone holds this role
            List<Users> usersWithRole = userRepo.findAll().stream()
                    .filter(user -> user.getRoles() != null && user.getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(role)))
                    .toList();
            log.info("ℹ️ There are {} user(s) with role {} but none have enabled push notifications",
                    usersWithRole.size(), role);
            return;
        }

        log.info("📤 Sending to {} subscription(s) with role {}", subscriptions.size(), role);

        int successCount = 0;
        int failCount = 0;

        for (PushSubscription sub : subscriptions) {
            try {
                sendPushNotification(sub, title, body, data);
                sub.setLastUsed(LocalDateTime.now());
                subscriptionRepo.save(sub);
                log.info("✅ Push notification sent successfully to {} (subscription ID: {})",
                        sub.getUser().getName(), sub.getId());
                successCount++;
            } catch (Exception e) {
                log.error("❌ Failed to send push to {} (subscription {}): {}",
                        sub.getUser().getName(), sub.getId(), e.getMessage());
                failCount++;

                if (e.getMessage().contains("410") || e.getMessage().contains("Gone")) {
                    sub.setActive(false);
                    subscriptionRepo.save(sub);
                    log.warn("⚠️ Marking subscription {} as inactive", sub.getId());
                }
            }
        }

        log.info("📊 Notification summary: {} sent, {} failed", successCount, failCount);
    }

    private void sendPushNotification(PushSubscription sub, String title, String body, Map<String, String> data)
            throws Exception {

        if (pushService == null) {
            log.warn("⚠️ Push service not initialized. Notification only logged to console.");
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("title", title);
        payload.put("body", body);
        payload.put("icon", "/logos/logo-light.png");
        payload.put("badge", "/favicon.ico");
        payload.put("data", data);

        String payloadJson = new Gson().toJson(payload);

        Notification notification = new Notification(
                sub.getEndpoint(),
                sub.getP256dh(),
                sub.getAuth(),
                payloadJson.getBytes()
        );

        pushService.send(notification);
    }

    public void unsubscribe(String endpoint) {
        Optional<PushSubscription> subscription = subscriptionRepo.findByEndpoint(endpoint);

        if (subscription.isPresent()) {
            PushSubscription sub = subscription.get();
            sub.setActive(false);
            subscriptionRepo.save(sub);
            log.info("🔕 Unsubscribed user {} from push notifications", sub.getUser().getName());
        } else {
            log.warn("⚠️ Subscription not found for endpoint: {}", endpoint);
        }
    }
}