import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../api/api";

/**
 * Driver Redirect Component
 * Redirects drivers to their deliveries page based on their user ID
 */
export default function DriverRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToDriverPage = async () => {
      try {
        // Check if userId is already stored
        const storedUserId =
          localStorage.getItem("userId") || sessionStorage.getItem("userId");

        if (storedUserId) {
          navigate("/driver-deliveries");
          return;
        }

        // Get user info from stored user object (includes id now)
        const userStr =
          localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!userStr) {
          navigate("/projects");
          return;
        }

        const user = JSON.parse(userStr);
        if (user.id) {
          // User ID is already in the stored user object
          const storage = localStorage.getItem("token")
            ? localStorage
            : sessionStorage;
          storage.setItem("userId", user.id);
          navigate("/driver-deliveries");
          return;
        }

        // Fallback: fetch from backend if id not in stored user
        if (user.email) {
          const userInfo = await getCurrentUser(user.email);
          if (userInfo && userInfo.id) {
            const storage = localStorage.getItem("token")
              ? localStorage
              : sessionStorage;
            storage.setItem("userId", userInfo.id);
            navigate("/driver-deliveries");
          } else {
            // Fallback if no user ID found
            console.error("No user ID found");
            navigate("/projects");
          }
        } else {
          navigate("/projects");
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        navigate("/projects");
      }
    };

    redirectToDriverPage();
  }, [navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: 18,
        color: "#666",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <i
          className="bx bx-loader-alt bx-spin"
          style={{ fontSize: 48, marginBottom: 16 }}
        />
        <div>Redirecting to your deliveries...</div>
      </div>
    </div>
  );
}
