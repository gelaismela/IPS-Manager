import React, { useState } from "react";
import { resetPassword } from "../api/api";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../styles/registration.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Show/hide password toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswords = () => {
    if (!newPassword || !confirmPassword) return "Please fill all fields";
    if (newPassword.length < 6) return "Password must be at least 6 characters";
    if (newPassword !== confirmPassword) return "Passwords do not match";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, newPassword);
      setMessage(
        "Password has been reset successfully! Redirecting to login..."
      );
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      setTimeout(() => {
        navigate("/login", { state: { resetSuccess: true } });
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Reset Password</h2>
        {error && <div className="error-message show">{error}</div>}
        {message && <div className="success-message show">{message}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className={`form-group ${error ? "error" : ""}`}>
            <div className="input-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder=" "
                required
              />
              <label htmlFor="newPassword">New Password</label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
                tabIndex={-1}
              >
                <span
                  className={`toggle-icon ${
                    showNewPassword ? "show-password" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className={`form-group ${error ? "error" : ""}`}>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder=" "
                required
              />
              <label htmlFor="confirmPassword">Confirm Password</label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
                tabIndex={-1}
              >
                <span
                  className={`toggle-icon ${
                    showConfirmPassword ? "show-password" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`login-btn ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
