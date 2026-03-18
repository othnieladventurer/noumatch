// src/pages/Login.jsx
import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from '@/api/axios';

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      // 👇 USING CONFIGURED AXIOS INSTANCE
      const response = await API.post("users/login/", formData);
      
      // Save tokens for auto-login
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      // Redirect to dashboard
      navigate("/dashboard");
      
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle error response
      if (error.response) {
        // Server responded with error
        let message = "";
        if (typeof error.response.data === "object") {
          for (let key in error.response.data) {
            message += `${key}: ${error.response.data[key]}\n`;
          }
        } else {
          message = error.response.data || "Login failed";
        }
        setErrorMessage(message);
      } else if (error.request) {
        // Request made but no response
        setErrorMessage("Network or server error. Please try again.");
      } else {
        // Something else happened
        setErrorMessage("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        backgroundImage:
          "url('https://img.freepik.com/free-photo/happy-african-loving-couple-hugging-outdoors-beach_171337-16188.jpg?semt=ais_hybrid&w=740&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      ></div>

      {/* Login Card */}
      <div
        className="card shadow-lg border-0 rounded-4 p-4 position-relative"
        style={{ width: "100%", maxWidth: "400px" }}
      >
        <div className="card-body">
          <div className="text-center mb-4">
            <h1 className="d-flex justify-content-center align-items-center fw-bold">
              <FaHeart className="text-danger me-2" />
              <span className="text-primary">NouMatch</span>
            </h1>
            <p className="text-muted mb-0">Find your perfect match</p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="alert alert-danger white-space-pre-wrap">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control form-control-lg"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control form-control-lg"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-danger w-100 btn-lg"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Don’t have an account?{" "}
              <Link
                to="/register"
                className="text-danger text-decoration-none fw-semibold"
              >
                Sign Up
              </Link>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
