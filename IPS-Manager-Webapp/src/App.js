import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import Registration from "./components/Registration";
import AdminPage from "./components/AdminPage";
import DeliveryList from "./components/DiliveryList";
import ProjectList from "./components/ProjectList";
import Project from "./components/Project";
import Delivery from "./components/Delivery";
import Deliveries from "./components/Diliveries";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function UserPage({ email }) {
  return <h1>Welcome, {email}!</h1>;
}

function UserPageWrapper() {
  const { email } = useParams();
  return <UserPage email={email} />;
}

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin", "dev"]}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute allowedRoles={["project_manager", "dev"]}>
                <ProjectList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:id"
            element={
              <ProtectedRoute allowedRoles={["project_manager", "dev"]}>
                <Project />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/:id"
            element={
              <ProtectedRoute allowedRoles={["driver", "dev"]}>
                <Delivery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveryRequests"
            element={
              <ProtectedRoute allowedRoles={["driver", "dev"]}>
                <DeliveryList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver-deliveries/:id"
            element={
              <ProtectedRoute allowedRoles={["driver", "dev"]}>
                <Deliveries />
              </ProtectedRoute>
            }
          />
          {/* Public routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
