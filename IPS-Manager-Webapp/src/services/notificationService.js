/**
 * Browser Push Notification Service
 * Handles permission requests, showing notifications, and tracking delivery status changes
 */

class NotificationService {
  constructor() {
    this.permission = "default";
    this.lastDeliveryStates = new Map(); // Track last known states to detect changes
  }

  /**
   * Request permission for browser notifications
   * @returns {Promise<string>} Permission status: 'granted', 'denied', or 'default'
   */
  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return "denied";
    }

    if (Notification.permission === "granted") {
      this.permission = "granted";
      return "granted";
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    }

    this.permission = "denied";
    return "denied";
  }

  /**
   * Check if notifications are supported and permitted
   * @returns {boolean}
   */
  isSupported() {
    return "Notification" in window && Notification.permission === "granted";
  }

  /**
   * Show a browser notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   */
  show(title, options = {}) {
    if (!this.isSupported()) {
      console.log("Notification blocked or not supported:", title);
      return null;
    }

    const defaultOptions = {
      icon: "/logo192.png", // React logo or your custom icon
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      tag: "delivery-notification", // Prevents duplicate notifications
      requireInteraction: false, // Auto-dismiss after a few seconds
      ...options,
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error("Failed to show notification:", error);
      return null;
    }
  }

  /**
   * Notify about material request status change
   * @param {Object} request - Material request object
   * @param {string} userRole - Current user's role
   */
  notifyMaterialRequestChange(request, userRole) {
    const { status, material, project, driver, requestedQuantity } = request;

    let title = "";
    let body = "";
    let shouldNotify = false;

    switch (status) {
      case "ASSIGNED":
        // Notify driver when assigned
        if (userRole === "DRIVER" || userRole === "HEAD_DRIVER") {
          title = "🚚 New Delivery Assignment";
          body = `You've been assigned to deliver ${requestedQuantity} ${material?.name} to ${project?.name}`;
          shouldNotify = true;
        }
        // Notify project manager when driver is assigned
        if (userRole === "PROJECT_MANAGER") {
          title = "✅ Driver Assigned";
          body = `${driver?.name || "A driver"} assigned for ${
            material?.name
          } delivery`;
          shouldNotify = true;
        }
        break;

      case "DELIVERED":
        // Notify project manager and head driver when delivered
        if (userRole === "PROJECT_MANAGER" || userRole === "HEAD_DRIVER") {
          title = "📦 Delivery Completed";
          body = `${material?.name} (${requestedQuantity}) delivered to ${project?.name}`;
          shouldNotify = true;
        }
        break;

      case "PENDING":
        // Notify head driver of new requests
        if (userRole === "HEAD_DRIVER") {
          title = "🔔 New Material Request";
          body = `${project?.name} requested ${requestedQuantity} ${material?.name}`;
          shouldNotify = true;
        }
        break;

      default:
        break;
    }

    if (shouldNotify) {
      this.show(title, {
        body,
        tag: `material-request-${request.id}`,
        data: { requestId: request.id, type: "material-request" },
      });
    }
  }

  /**
   * Notify about delivery status change
   * @param {Object} delivery - Delivery object
   * @param {string} userRole - Current user's role
   */
  notifyDeliveryChange(delivery, userRole) {
    const { status, project, driver, id } = delivery;

    let title = "";
    let body = "";
    let shouldNotify = false;

    switch (status) {
      case "ASSIGNED":
        // Notify driver
        if (userRole === "DRIVER") {
          title = "🚚 New Delivery Assignment";
          body = `You have a new delivery to ${project?.name || "project"}`;
          shouldNotify = true;
        }
        break;

      case "IN_TRANSIT":
        // Notify project manager and head driver
        if (userRole === "PROJECT_MANAGER" || userRole === "HEAD_DRIVER") {
          title = "🚛 Delivery In Transit";
          body = `${driver?.name || "Driver"} is on the way to ${
            project?.name || "project"
          }`;
          shouldNotify = true;
        }
        break;

      case "DELIVERED":
        // Notify everyone
        if (["PROJECT_MANAGER", "HEAD_DRIVER", "ADMIN"].includes(userRole)) {
          title = "✅ Delivery Completed";
          body = `Delivery to ${
            project?.name || "project"
          } completed successfully`;
          shouldNotify = true;
        }
        break;

      case "CANCELLED":
        // Notify driver and project manager
        if (["DRIVER", "PROJECT_MANAGER"].includes(userRole)) {
          title = "❌ Delivery Cancelled";
          body = `Delivery to ${project?.name || "project"} has been cancelled`;
          shouldNotify = true;
        }
        break;

      default:
        break;
    }

    if (shouldNotify) {
      this.show(title, {
        body,
        tag: `delivery-${id}`,
        data: { deliveryId: id, type: "delivery" },
      });
    }
  }

  /**
   * Check for delivery status changes and notify
   * @param {Array} deliveries - Array of delivery objects
   * @param {string} userRole - Current user's role
   */
  checkDeliveryChanges(deliveries, userRole) {
    if (!Array.isArray(deliveries)) return;

    deliveries.forEach((delivery) => {
      const lastState = this.lastDeliveryStates.get(delivery.id);
      const currentState = {
        status: delivery.status,
        timestamp: Date.now(),
      };

      // If state changed, notify
      if (lastState && lastState.status !== currentState.status) {
        this.notifyDeliveryChange(delivery, userRole);
      }

      // Update last known state
      this.lastDeliveryStates.set(delivery.id, currentState);
    });
  }

  /**
   * Check for material request status changes and notify
   * @param {Array} requests - Array of material request objects
   * @param {string} userRole - Current user's role
   */
  checkMaterialRequestChanges(requests, userRole) {
    if (!Array.isArray(requests)) return;

    requests.forEach((request) => {
      const lastState = this.lastDeliveryStates.get(`mr-${request.id}`);
      const currentState = {
        status: request.status,
        timestamp: Date.now(),
      };

      // If state changed, notify
      if (lastState && lastState.status !== currentState.status) {
        this.notifyMaterialRequestChange(request, userRole);
      }

      // Update last known state
      this.lastDeliveryStates.set(`mr-${request.id}`, currentState);
    });
  }

  /**
   * Initialize tracking for existing items (don't notify on first load)
   * @param {Array} items - Array of delivery or material request objects
   * @param {string} prefix - Prefix for tracking key ('mr-' for material requests)
   */
  initializeTracking(items, prefix = "") {
    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      const key = prefix ? `${prefix}${item.id}` : item.id;
      this.lastDeliveryStates.set(key, {
        status: item.status,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Clear all tracked states (useful on logout)
   */
  clearTracking() {
    this.lastDeliveryStates.clear();
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
