package com.IPS.IPS_Manager.Generator;

import nl.martijndwars.webpush.Utils;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Security;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;

public class ValidKeyGenerator {

    public static void main(String[] args) {
        try {
            System.out.println("🔑 Generating VAPID Keys for Push Notifications...\n");

            // Generate EC P-256 key pair (standard for VAPID)
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("EC");
            ECGenParameterSpec ecSpec = new ECGenParameterSpec("secp256r1"); // P-256 curve
            keyPairGenerator.initialize(ecSpec, new SecureRandom());
            KeyPair keyPair = keyPairGenerator.generateKeyPair();

            // Get public and private keys
            ECPublicKey publicKey = (ECPublicKey) keyPair.getPublic();
            ECPrivateKey privateKey = (ECPrivateKey) keyPair.getPrivate();

            // Convert to uncompressed format (required for VAPID)
            byte[] publicKeyBytes = encodePublicKey(publicKey);
            byte[] privateKeyBytes = privateKey.getS().toByteArray();

            // Pad private key to 32 bytes if needed
            if (privateKeyBytes.length < 32) {
                byte[] padded = new byte[32];
                System.arraycopy(privateKeyBytes, 0, padded, 32 - privateKeyBytes.length, privateKeyBytes.length);
                privateKeyBytes = padded;
            } else if (privateKeyBytes.length > 32) {
                // Remove leading zero byte if present
                byte[] trimmed = new byte[32];
                System.arraycopy(privateKeyBytes, privateKeyBytes.length - 32, trimmed, 0, 32);
                privateKeyBytes = trimmed;
            }

            // Encode to Base64 URL-safe (no padding)
            String publicKeyBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKeyBytes);
            String privateKeyBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(privateKeyBytes);

            System.out.println("✅ VAPID Keys Generated Successfully!\n");
            System.out.println("📋 Add these to your application.properties file:\n");
            System.out.println("# Push Notification VAPID Keys");
            System.out.println("push.notification.public-key=" + publicKeyBase64);
            System.out.println("push.notification.private-key=" + privateKeyBase64);
            System.out.println("push.notification.subject=mailto:your-email@example.com");
            System.out.println("\n⚠️ IMPORTANT: Keep the private key SECRET!");
            System.out.println("⚠️ Never commit these keys to version control!");
            System.out.println("\n✨ You can now use push notifications in your app!");

        } catch (Exception e) {
            System.err.println("❌ Error generating keys: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Encode EC public key to uncompressed format (0x04 + X + Y)
     * Required format for VAPID public keys
     */
    private static byte[] encodePublicKey(ECPublicKey publicKey) {
        // Get X and Y coordinates
        byte[] x = publicKey.getW().getAffineX().toByteArray();
        byte[] y = publicKey.getW().getAffineY().toByteArray();

        // Ensure 32 bytes each (remove leading zeros or pad)
        byte[] xBytes = padOrTrim(x, 32);
        byte[] yBytes = padOrTrim(y, 32);

        // Create uncompressed format: 0x04 + X (32 bytes) + Y (32 bytes) = 65 bytes total
        byte[] encoded = new byte[65];
        encoded[0] = 0x04; // Uncompressed point indicator
        System.arraycopy(xBytes, 0, encoded, 1, 32);
        System.arraycopy(yBytes, 0, encoded, 33, 32);

        return encoded;
    }

    /**
     * Pad or trim byte array to specified length
     */
    private static byte[] padOrTrim(byte[] input, int length) {
        if (input.length == length) {
            return input;
        } else if (input.length > length) {
            // Trim (remove leading zeros)
            byte[] trimmed = new byte[length];
            System.arraycopy(input, input.length - length, trimmed, 0, length);
            return trimmed;
        } else {
            // Pad with leading zeros
            byte[] padded = new byte[length];
            System.arraycopy(input, 0, padded, length - input.length, input.length);
            return padded;
        }
    }
}