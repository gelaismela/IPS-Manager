import React from "react";
import { useMaterialRequestNotifications } from "../hooks/useMaterialRequestNotifications";

export default function NotificationsBell() {
  const { notifications, unreadCount, open, setOpen, loading } =
    useMaterialRequestNotifications({ pollMs: 30000 });

  const getStatusBadge = (status) => {
    const styles = {
      DELIVERED: { bg: "#28a745", text: "#fff" },
      ASSIGNED: { bg: "#007bff", text: "#fff" },
      PENDING: { bg: "#ffc107", text: "#000" },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 8px",
          borderRadius: 12,
          background: style.bg,
          color: style.text,
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="nav-link"
        style={{
          position: "relative",
          fontSize: 22,
          padding: "8px 12px",
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        <i className="bx bxs-bell" />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              background: "#ff4444",
              color: "#fff",
              borderRadius: "50%",
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              border: "2px solid #fff",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 12px)",
            width: 360,
            maxHeight: 480,
            overflowY: "auto",
            background: "#fff",
            border: "none",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #f0f0f0",
              fontWeight: "600",
              fontSize: 16,
              color: "#333",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: "#007bff",
                  fontWeight: 500,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                fontSize: 14,
                color: "#999",
              }}
            >
              <i
                className="bx bx-loader-alt bx-spin"
                style={{ fontSize: 24 }}
              />
              <div style={{ marginTop: 8 }}>Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                fontSize: 14,
                color: "#999",
              }}
            >
              <i
                className="bx bx-bell-off"
                style={{ fontSize: 48, color: "#ddd" }}
              />
              <div style={{ marginTop: 12 }}>No notifications</div>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.key}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #f8f8f8",
                    background: n.unread
                      ? "linear-gradient(to right, #f0f7ff, #ffffff)"
                      : "#fff",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.unread
                      ? "linear-gradient(to right, #f0f7ff, #ffffff)"
                      : "#fff";
                  }}
                  onClick={() => {
                    // Optional: navigate to request details
                    // navigate(`/requests/${n.requestId}`);
                  }}
                >
                  {n.unread && (
                    <div
                      style={{
                        position: "absolute",
                        left: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#007bff",
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: "#333",
                        flex: 1,
                      }}
                    >
                      {n.title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 8,
                      fontWeight: 500,
                    }}
                  >
                    {n.projectCode && (
                      <span
                        style={{
                          background: "#f0f0f0",
                          padding: "2px 8px",
                          borderRadius: 4,
                          marginRight: 6,
                        }}
                      >
                        {n.projectCode}
                      </span>
                    )}
                    {n.projectName}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                      color: "#999",
                    }}
                  >
                    {getStatusBadge(n.status)}
                    {n.when && <span>{String(n.when).slice(0, 10)}</span>}
                    {n.driverName && (
                      <>
                        <span>•</span>
                        <span>{n.driverName}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
