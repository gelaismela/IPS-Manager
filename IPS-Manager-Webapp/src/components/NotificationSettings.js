import React, { useState, useEffect } from "react";
import notificationService from "../services/notificationService";

/**
 * Notification Settings Component
 * Shows notification status and allows users to enable/disable notifications
 */
export default function NotificationSettings() {
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);

    if (result === "granted") {
      // Show a test notification
      notificationService.show("🎉 Notifications Enabled!", {
        body: "You'll now receive delivery status updates",
      });
    }
  };

  if (!isSupported) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <i className="bx bx-bell-off" style={styles.iconLarge} />
          <h3 style={styles.title}>Notifications Not Supported</h3>
          <p style={styles.text}>
            Your browser doesn't support push notifications. Please use a modern
            browser like Chrome, Firefox, or Edge.
          </p>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderColor: "#dc3545" }}>
          <i
            className="bx bx-bell-off"
            style={{ ...styles.iconLarge, color: "#dc3545" }}
          />
          <h3 style={styles.title}>Notifications Blocked</h3>
          <p style={styles.text}>
            You've blocked notifications for this site. To enable them:
          </p>
          <ol style={styles.list}>
            <li>Click the lock icon in your browser's address bar</li>
            <li>Find "Notifications" in the permissions list</li>
            <li>Change the setting to "Allow"</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      </div>
    );
  }

  if (permission === "granted") {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, borderColor: "#28a745" }}>
          <i
            className="bx bxs-bell-check"
            style={{ ...styles.iconLarge, color: "#28a745" }}
          />
          <h3 style={styles.title}>Notifications Enabled</h3>
          <p style={styles.text}>You'll receive browser notifications when:</p>
          <ul style={styles.list}>
            <li>🚚 A delivery is assigned to you (Drivers)</li>
            <li>
              ✅ A driver is assigned to your material request (Project
              Managers)
            </li>
            <li>
              📦 A delivery is completed (Project Managers & Head Drivers)
            </li>
            <li>🔔 New material requests are created (Head Drivers)</li>
            <li>🚛 Delivery status changes (All relevant users)</li>
          </ul>
          <button
            onClick={() => {
              notificationService.show("🧪 Test Notification", {
                body: "This is how delivery notifications will look!",
              });
            }}
            style={styles.testButton}
          >
            <i className="bx bx-bell" style={{ marginRight: 8 }} />
            Send Test Notification
          </button>
        </div>
      </div>
    );
  }

  // Default state
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <i className="bx bx-bell" style={styles.iconLarge} />
        <h3 style={styles.title}>Enable Delivery Notifications</h3>
        <p style={styles.text}>
          Get real-time browser notifications for delivery status updates.
          You'll be notified about:
        </p>
        <ul style={styles.list}>
          <li>New delivery assignments</li>
          <li>Driver assignments</li>
          <li>Delivery status changes</li>
          <li>Material request updates</li>
        </ul>
        <button onClick={handleEnableNotifications} style={styles.button}>
          <i className="bx bxs-bell-ring" style={{ marginRight: 8 }} />
          Enable Notifications
        </button>
        <p style={styles.smallText}>
          You can disable notifications at any time from your browser settings.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
    padding: 20,
  },
  card: {
    maxWidth: 500,
    background: "#fff",
    border: "2px solid #e0e0e0",
    borderRadius: 12,
    padding: 32,
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  iconLarge: {
    fontSize: 64,
    color: "#007bff",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 16,
    color: "#333",
  },
  text: {
    fontSize: 15,
    color: "#666",
    lineHeight: 1.6,
    marginBottom: 16,
    textAlign: "left",
  },
  list: {
    textAlign: "left",
    fontSize: 14,
    color: "#666",
    lineHeight: 1.8,
    marginBottom: 24,
    paddingLeft: 20,
  },
  button: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 32px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    transition: "all 0.2s ease",
  },
  testButton: {
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    transition: "all 0.2s ease",
  },
  smallText: {
    fontSize: 12,
    color: "#999",
    marginTop: 16,
    fontStyle: "italic",
  },
};
