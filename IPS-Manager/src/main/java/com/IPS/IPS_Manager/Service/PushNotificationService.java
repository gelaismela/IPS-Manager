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
import java.util.stream.Collectors;

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

    /**
     * Sends a push notification to EVERY active browser session/device associated with the user account.
     * Automatically forwards a copy to all registered Admins if the targeted user isn't an Admin.
     */
    public void sendToUser(Users user, String title, String body, Map<String, String> data) {
        log.info("📧 NOTIFICATION TO USER: {} ({})", user.getName(), user.getRoles());
        log.info("   Title: {}", title);
        log.info("   Body: {}", body);
        log.info("   Data: {}", data);

        // 1. Send to all active endpoints registered to this account (PC, Mobile, Table, etc.)
        List<PushSubscription> subscriptions = subscriptionRepo.findByUserAndActiveTrue(user);

        if (subscriptions.isEmpty()) {
            log.warn("⚠️ No active device subscriptions found for user: {}", user.getName());
        } else {
            log.info("📤 Sending to {} active user device context connection(s)", subscriptions.size());
            for (PushSubscription sub : subscriptions) {
                executePushDelivery(sub, title, body, data);
            }
        }

        // 2. 🛡️ ADMIN AUDIT HOOK: Forward mirrored data directly to all Admin devices
        boolean isAdmin = user.getRoles() != null && user.getRoles().stream().anyMatch(r -> r.equalsIgnoreCase("admin"));
        if (!isAdmin) {
            log.info("👁️ [BCC Activity] Mirroring notification data stream copy to all active Admins");
            broadcastToRoleDevices("admin", "[Admin Copy] " + title, body, data);
        }
    }

    /**
     * Broadcasts a push notification to every active device of every user who holds this role.
     * Automatically captures a backup copy for Admin dashboards if the role isn't 'admin'.
     */
    public void sendToRole(String role, String title, String body, Map<String, String> data) {
        log.info("🔔 NOTIFICATION TO ROLE: {}", role);
        log.info("   Title: {}", title);
        log.info("   Body: {}", body);
        log.info("   Data: {}", data);

        // 1. Broadcast layout message payload to original target role
        broadcastToRoleDevices(role, title, body, data);

        // 2. 🛡️ ADMIN AUDIT HOOK: If the original broadcast wasn't for admins, send them a clone update
        if (!role.equalsIgnoreCase("admin")) {
            log.info("👁️ [BCC Activity] Mirroring system broadcast context updates to all active Admins");
            broadcastToRoleDevices("admin", "[Admin Copy] " + title, body, data);
        }
    }

    /**
     * Isolated private loop handler preventing endless loop conditions during Admin duplication routing.
     */
    private void broadcastToRoleDevices(String role, String title, String body, Map<String, String> data) {
        List<PushSubscription> subscriptions = subscriptionRepo.findAll().stream()
                .filter(sub -> sub.isActive() && sub.getUser() != null && sub.getUser().getRoles() != null)
                .filter(sub -> sub.getUser().getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(role)))
                .collect(Collectors.toList());

        if (subscriptions.isEmpty()) {
            log.debug("ℹ️ No active client connections listening for roles matching context: {}", role);
            return;
        }

        for (PushSubscription sub : subscriptions) {
            executePushDelivery(sub, title, body, data);
        }
    }

    /**
     * Low-level executor wrapper that signs the payload byte buffer with VAPID signatures and drops dead tokens.
     */
    private void executePushDelivery(PushSubscription sub, String title, String body, Map<String, String> data) {
        try {
            sendPushNotification(sub, title, body, data);
            sub.setLastUsed(LocalDateTime.now());
            subscriptionRepo.save(sub);
            log.info("✅ Push successfully processed for device endpoint matching subscription identifier: {}", sub.getId());
        } catch (Exception e) {
            log.error("❌ Failed to deliver payload package to device token map reference {}: {}", sub.getId(), e.getMessage());

            // 410 Gone / 404 Not Found explicitly means the user uninstalled or cleared cookies. Drop it.
            if (e.getMessage().contains("410") || e.getMessage().contains("Gone") || e.getMessage().contains("404")) {
                sub.setActive(false);
                subscriptionRepo.save(sub);
                log.warn("🗑️ Dropped uninstalled/expired push subscription endpoint trace token from database: {}", sub.getId());
            }
        }
    }

    private void sendPushNotification(PushSubscription sub, String title, String body, Map<String, String> data)
            throws Exception {

        if (pushService == null) {
            log.warn("⚠️ Push execution aborted: VAPID service engine not active.");
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