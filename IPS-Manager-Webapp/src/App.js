import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import Registration from "./components/Registration";
import AdminPage from "./components/AdminPage";
import DeliveryList from "./components/DiliveryList";
import ProjectList from "./components/ProjectList";
import Project from "./components/Project";
import Delivery from "./components/Delivery";
import Deliveries from "./components/Diliveries";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import NotificationSettings from "./components/NotificationSettings";
import DriverRedirect from "./components/DriverRedirect";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PushNotificationSubscriber from "./components/PushNotificationSubscriber";

function ServiceWorkerNavigate() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const messageHandler = (event) => {
      const data = event.data;
      if (!data || data.action !== "navigate") return;
      const targetUrl = data.url;
      if (!targetUrl) return;

      try {
        const parsed = new URL(targetUrl, window.location.origin);
        navigate(parsed.pathname + parsed.search + parsed.hash);
      } catch {
        if (targetUrl.startsWith("/")) {
          navigate(targetUrl);
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", messageHandler);
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <div className="App">
        <Router>
          <PushNotificationSubscriber />
          <ServiceWorkerNavigate />
          <Routes>
            <Route path="/" element={<Registration />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "dev", "project_manager"]}
                >
                  <>
                    <Navbar />
                    <AdminPage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute
                  allowedRoles={["project_manager", "dev", "head_of_driver"]}
                >
                  <>
                    <Navbar />
                    <ProjectList />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute
                  allowedRoles={["project_manager", "dev", "head_of_driver"]}
                >
                  <>
                    <Navbar />
                    <Project />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery/:id"
              element={
                <ProtectedRoute allowedRoles={["dev", "head_driver"]}>
                  <>
                    <Navbar />
                    <Delivery />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveryRequests"
              element={
                <ProtectedRoute allowedRoles={["head_driver", "dev"]}>
                  <>
                    <Navbar />
                    <DeliveryList />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <ProtectedRoute allowedRoles={["driver", "dev"]}>
                  <>
                    <Navbar />
                    <DriverRedirect />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-deliveries"
              element={
                <ProtectedRoute allowedRoles={["driver", "dev"]}>
                  <>
                    <Navbar />
                    <Deliveries />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification-settings"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "admin",
                    "dev",
                    "project_manager",
                    "driver",
                    "head_driver",
                  ]}
                >
                  <>
                    <Navbar />
                    <NotificationSettings />
                  </>
                </ProtectedRoute>
              }
            />
            {/* Public routes */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Router>
      </div>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
