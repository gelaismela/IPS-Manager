import { useEffect, useRef } from "react";
import notificationService from "../services/notificationService";
import { getUserRole } from "../services/roleService";

/**
 * Hook to manage delivery and material request notifications
 * Automatically requests permission and tracks changes
 *
 * @param {Array} deliveries - Array of delivery objects to monitor
 * @param {Array} materialRequests - Array of material request objects to monitor
 * @param {boolean} enabled - Whether notifications are enabled (default: true)
 */
export function useDeliveryNotifications(
  deliveries = [],
  materialRequests = [],
  enabled = true
) {
  const isInitialized = useRef(false);
  const permissionRequested = useRef(false);
  const userRole = getUserRole();

  // Request notification permission on mount
  useEffect(() => {
    if (!enabled || permissionRequested.current) return;

    const requestPermission = async () => {
      try {
        const permission = await notificationService.requestPermission();
        permissionRequested.current = true;

        if (permission === "granted") {
          console.log("✅ Browser notifications enabled");
        } else if (permission === "denied") {
          console.log("❌ Browser notifications blocked by user");
        }
      } catch (error) {
        console.error("Failed to request notification permission:", error);
      }
    };

    // Only request after a short delay to avoid annoying users immediately
    const timer = setTimeout(requestPermission, 2000);
    return () => clearTimeout(timer);
  }, [enabled]);

  // Initialize tracking for deliveries
  useEffect(() => {
    if (!enabled || !deliveries || deliveries.length === 0) return;

    if (!isInitialized.current) {
      // First load: just track, don't notify
      notificationService.initializeTracking(deliveries, "");
      isInitialized.current = true;
    } else {
      // Subsequent loads: check for changes and notify
      notificationService.checkDeliveryChanges(deliveries, userRole);
    }
  }, [deliveries, enabled, userRole]);

  // Initialize tracking for material requests
  useEffect(() => {
    if (!enabled || !materialRequests || materialRequests.length === 0) return;

    if (!isInitialized.current) {
      // First load: just track, don't notify
      notificationService.initializeTracking(materialRequests, "mr-");
      isInitialized.current = true;
    } else {
      // Subsequent loads: check for changes and notify
      notificationService.checkMaterialRequestChanges(
        materialRequests,
        userRole
      );
    }
  }, [materialRequests, enabled, userRole]);

  // Clear tracking on unmount
  useEffect(() => {
    return () => {
      if (!enabled) return;
      // Don't clear on every unmount, only when explicitly disabled
      // notificationService.clearTracking();
    };
  }, [enabled]);

  return {
    isSupported: notificationService.isSupported(),
    permission: notificationService.permission,
  };
}
