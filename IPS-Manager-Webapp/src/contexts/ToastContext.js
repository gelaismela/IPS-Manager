import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

const STYLES = {
  success: { bg: "#dcfce7", border: "#22c55e", text: "#166534", icon: "✅" },
  error:   { bg: "#fee2e2", border: "#ef4444", text: "#991b1b", icon: "❌" },
  warning: { bg: "#fef9c3", border: "#f59e0b", text: "#92400e", icon: "⚠️" },
  info:    { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3", icon: "ℹ️" },
};

function ToastItem({ toast, onDismiss }) {
  const s = STYLES[toast.type] || STYLES.info;
  return (
    <div
      style={{
        background: s.bg,
        border: `1.5px solid ${s.border}`,
        color: s.text,
        borderRadius: "10px",
        padding: "12px 14px",
        minWidth: "260px",
        maxWidth: "420px",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
        pointerEvents: "all",
        animation: "ips-toast-in 0.22s ease",
      }}
    >
      <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{s.icon}</span>
      <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: s.text, fontSize: "18px", lineHeight: 1, padding: 0, flexShrink: 0, opacity: 0.6 }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <>
        <style>{`
          @keyframes ips-toast-in {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        {toasts.length > 0 && (
          <div
            style={{
              position: "fixed",
              top: "68px",
              right: "18px",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              pointerEvents: "none",
            }}
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>
        )}
      </>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
