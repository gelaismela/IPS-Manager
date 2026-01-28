package com.IPS.IPS_Manager.DTO;

import lombok.Data;

/**
 * DTO for push notification subscription from frontend
 */
@Data
public class PushSubscriptionDTO {
    private String endpoint;
    private Keys keys;
    
    @Data
    public static class Keys {
        private String p256dh;
        private String auth;
    }
}
