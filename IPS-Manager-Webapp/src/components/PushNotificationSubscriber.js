import { useEffect } from "react";
import { getVapidPublicKey, subscribeToPushNotifications } from "../api/api";

/**
 * Auto-subscribe to push notifications when user is logged in
 * This component doesn't render anything - it just handles the subscription
 */
export default function PushNotificationSubscriber() {
  useEffect(() => {
    // Check if user is logged in
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      return;
    }

    // Auto-subscribe if conditions are met
    autoSubscribeToPush();
  }, []);

  const autoSubscribeToPush = async () => {
    // Check if browser supports push notifications
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    // Request permission if not granted yet
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        return;
      }
    } else if (Notification.permission === "denied") {
      return;
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return;
      }

      // Not subscribed yet - let's subscribe

      // Get VAPID public key from backend
      const vapidResponse = await getVapidPublicKey();
      const vapidPublicKey = vapidResponse.publicKey;

      // Convert VAPID key from base64 to Uint8Array
      const urlBase64ToUint8Array = (base64String) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, "+")
          .replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Convert subscription to format backend expects
      const subscriptionJSON = subscription.toJSON();
      const pushSubscription = {
        endpoint: subscriptionJSON.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys.p256dh,
          auth: subscriptionJSON.keys.auth,
        },
      };

      // Send subscription to backend
      await subscribeToPushNotifications(pushSubscription);
    } catch (error) {
      console.error("❌ Auto-subscribe failed:", error);
      // Silently fail - user can still use the app
    }
  };

  // This component doesn't render anything
  return null;
}
