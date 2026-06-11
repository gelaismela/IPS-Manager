import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for push notifications
if ("serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost")) {
  // Register as early as possible (don't wait for load) so mobile browsers can activate SW quickly
  (async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      // Check for a new SW version immediately
      registration.update();

      // When a new SW installs and takes over, reload the page once
      // so users always get the latest build without a hard refresh
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      console.log("✅ Service Worker registered:", registration.scope);
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
    }
  })();
} else {
  console.warn("Service Worker not supported or insecure context (requires https:// or localhost)");
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
