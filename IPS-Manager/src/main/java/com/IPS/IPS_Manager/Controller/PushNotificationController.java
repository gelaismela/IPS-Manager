package com.IPS.IPS_Manager.Controller;

import org.springframework.beans.factory.annotation.Value;
import com.IPS.IPS_Manager.DTO.PushSubscriptionDTO;
import com.IPS.IPS_Manager.Entity.PushSubscription;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.UserRepo;
import com.IPS.IPS_Manager.Service.PushNotificationService;
import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for push notification management
 */
@RestController
@RequestMapping("/api/push-notifications")
@RequiredArgsConstructor
@Slf4j
public class PushNotificationController {
    private final PushNotificationService pushService;
    private final UserRepo userRepo;

    /**
     * Subscribe to push notifications
     */
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody PushSubscriptionDTO dto) {
        try {
            Users currentUser = getCurrentUser();

            log.info("📥 Received subscription request from user: {} ({})",
                    currentUser.getName(), currentUser.getRole());

            PushSubscription subscription = pushService.subscribe(currentUser, dto);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Subscribed successfully",
                    "subscriptionId", subscription.getId()
            ));
        } catch (Exception e) {
            log.error("❌ Subscription failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    @PostMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestBody Map<String, String> payload) {
        try {
            String endpoint = payload.get("endpoint");

            if (endpoint == null || endpoint.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Endpoint is required"
                ));
            }

            pushService.unsubscribe(endpoint);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Unsubscribed successfully"
            ));
        } catch (Exception e) {
            log.error("❌ Unsubscribe failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Test notification endpoint
     */
    @PostMapping("/test")
    public ResponseEntity<?> testNotification() {
        try {
            Users currentUser = getCurrentUser();

            log.info("🧪 Test notification requested by: {}", currentUser.getName());

            Map<String, String> data = new HashMap<>();
            data.put("type", "test");
            data.put("timestamp", String.valueOf(System.currentTimeMillis()));

            pushService.sendToUser(
                    currentUser,
                    "🧪 Test Notification",
                    "This is a test push notification! If you see this, everything is working correctly.",
                    data
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Test notification sent"
            ));
        } catch (Exception e) {
            log.error("❌ Test notification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Get current authenticated user
     */
    private Users getCurrentUser() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        // Try to find by email first
        return userRepo.findByMail(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }


    @Value("${push.notification.public-key:}")
    private String vapidPublicKey;

    /**
     * Get VAPID public key for push subscription
     */
    @GetMapping("/vapid-public-key")
    public ResponseEntity<?> getVapidPublicKey() {
        log.info("📋 VAPID public key requested");

        if (vapidPublicKey == null || vapidPublicKey.isEmpty()) {
            log.warn("⚠️ VAPID public key not configured!");
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "VAPID keys not configured on server"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "publicKey", vapidPublicKey
        ));
    }
}
