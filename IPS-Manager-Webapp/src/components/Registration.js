import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // react-router
import "../styles/registration.css";
import { login } from "../api/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // ✅ Check if user already logged in
  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const role = localStorage.getItem("role") || sessionStorage.getItem("role");

    if (token && role) {
      navigate(`/${role}`); // redirect directly
    }
  }, [navigate]);

  const validateEmail = () => {
    if (!email) return "Email is required";
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = () => {
    if (!password) return "Password is required";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailError = validateEmail();
    const passwordError = validatePassword();

    if (emailError || passwordError) {
      setError({ email: emailError, password: passwordError });
      return;
    }

    setError({ email: "", password: "" });
    setLoading(true);

    try {
      // 🔑 call backend API
      const response = await login(email, password);

      // Suppose backend returns { token, role }
      const { token, role } = response;

      // ✅ Store token + role
      if (remember) {
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("role", role);
      }

      setSuccess(true);

      // Redirect after short delay
      setTimeout(() => {
        navigate(`/${role}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError((prev) => ({
        ...prev,
        password: "Login failed. Please check your credentials.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {!success && (
          <>
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to continue</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className={`form-group ${error.email ? "error" : ""}`}>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() =>
                      setError((prev) => ({ ...prev, email: validateEmail() }))
                    }
                    autoComplete="email"
                    placeholder=" "
                    required
                  />
                  <label htmlFor="email">Email</label>
                </div>
                <span className={`error-message ${error.email ? "show" : ""}`}>
                  {error.email}
                </span>
              </div>

              {/* Password */}
              <div className={`form-group ${error.password ? "error" : ""}`}>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() =>
                      setError((prev) => ({
                        ...prev,
                        password: validatePassword(),
                      }))
                    }
                    autoComplete="current-password"
                    placeholder=" "
                    required
                  />
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    id="passwordToggle"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span
                      className={`toggle-icon ${
                        showPassword ? "show-password" : ""
                      }`}
                    />
                  </button>
                </div>
                <span
                  className={`error-message ${error.password ? "show" : ""}`}
                >
                  {error.password}
                </span>
              </div>

              {/* Remember me + Forgot password */}
              <div className="form-options">
                <div className="remember-wrapper">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label htmlFor="remember" className="checkbox-label">
                    <span className="checkmark"></span>
                    Remember me
                  </label>
                </div>
                <a href="/forgot-password" className="forgot-password">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                <span className="btn-text">
                  {loading ? "Signing in..." : "Sign In"}
                </span>
                <span className="btn-loader"></span>
              </button>
            </form>
          </>
        )}

        {/* Success Message */}
        <div className={`success-message ${success ? "show" : ""}`}>
          <div className="success-icon">✓</div>
          <h3>Welcome back!</h3>
          <p>Redirecting to your dashboard...</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
