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
      console.log("ℹ️ User not logged in, skipping push subscription");
      return;
    }

    // Auto-subscribe if conditions are met
    autoSubscribeToPush();
  }, []);

  const autoSubscribeToPush = async () => {
    // Check if browser supports push notifications
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("ℹ️ Push notifications not supported by browser");
      return;
    }

    // Request permission if not granted yet
    if (Notification.permission === "default") {
      console.log("🔔 Requesting notification permission...");
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.log("ℹ️ User denied notification permission");
        return;
      }
      console.log("✅ Notification permission granted!");
    } else if (Notification.permission === "denied") {
      console.log("ℹ️ Notification permission denied by user");
      return;
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("✅ Already subscribed to push notifications");
        return;
      }

      // Not subscribed yet - let's subscribe
      console.log("🔄 Auto-subscribing to push notifications...");

      // Get VAPID public key from backend
      console.log("📡 Fetching VAPID public key...");
      const vapidResponse = await getVapidPublicKey();
      const vapidPublicKey = vapidResponse.publicKey;
      console.log("✅ Got VAPID public key");

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
      console.log("🔔 Creating push subscription...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      console.log("✅ Push subscription created");

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
      console.log("📤 Sending subscription to backend...");
      await subscribeToPushNotifications(pushSubscription);
      console.log("✅ Successfully subscribed to push notifications!");
    } catch (error) {
      console.error("❌ Auto-subscribe failed:", error);
      // Silently fail - user can still use the app
    }
  };

  // This component doesn't render anything
  return null;
}
