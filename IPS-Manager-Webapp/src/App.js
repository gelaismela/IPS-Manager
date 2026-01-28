import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
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

function UserPage({ email }) {
  return <h1>Welcome, {email}!</h1>;
}

function UserPageWrapper() {
  const { email } = useParams();
  return <UserPage email={email} />;
}

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <Router>
          <PushNotificationSubscriber />
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
                <ProtectedRoute allowedRoles={["dev", "head_of_drivers"]}>
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
                <ProtectedRoute allowedRoles={["head_of_drivers", "dev"]}>
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
    </ThemeProvider>
  );
}

export default App;
