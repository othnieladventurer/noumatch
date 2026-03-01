import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    birth_date: "",
    gender: "",
    interested_in: "",
    password: "",
    password2: "",
    profile_photo: null,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.password !== formData.password2) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const data = new FormData();
    data.append("username", formData.username);
    data.append("email", formData.email);
    data.append("birth_date", formData.birth_date);
    data.append("gender", formData.gender);
    data.append("interested_in", formData.interested_in);
    data.append("password", formData.password);

    if (formData.profile_photo) {
      data.append("profile_photo", formData.profile_photo);
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/users/register/",
        {
          method: "POST",
          body: data, // DO NOT set Content-Type manually
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Save tokens
        localStorage.setItem("access", result.access);
        localStorage.setItem("refresh", result.refresh);

        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        let message = "";
        if (typeof result === "object") {
          for (let key in result) {
            message += `${key}: ${result[key]}\n`;
          }
        } else {
          message = JSON.stringify(result);
        }
        setErrorMessage(message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        backgroundImage:
          "url('https://img.freepik.com/free-photo/romantic-black-couple-sitting-restaurant-wearing-elegant-clothes_1157-51961.jpg?semt=ais_user_personalization&w=740&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "1rem",
      }}
    >
      {/* Dark overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      ></div>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 position-relative"
        style={{
          width: "100%",
          maxWidth: "500px",
          maxHeight: "95vh",
          overflowY: "auto",
        }}
      >
        <div className="card-body">

          {/* Branding */}
          <div className="text-center mb-4">
            <h1 className="d-flex justify-content-center align-items-center fw-bold">
              <FaHeart className="text-danger me-2" />
              <span className="text-primary">NouMatch</span>
            </h1>
            <p className="text-muted mb-0">Create your account</p>
          </div>

          {errorMessage && (
            <div className="alert alert-danger white-space-pre-wrap">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="row">

              {/* Username */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Email */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Birth Date */}
              <div className="col-12 mb-3">
                <label className="form-label">Birth Date</label>
                <input
                  type="date"
                  name="birth_date"
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Gender */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Gender</label>
                <select
                  name="gender"
                  className="form-control"
                  required
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Interested In */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Interested In</label>
                <select
                  name="interested_in"
                  className="form-control"
                  required
                  onChange={handleChange}
                >
                  <option value="">Select preference</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="everyone">Everyone</option>
                </select>
              </div>

              {/* Profile Photo */}
              <div className="col-12 mb-3">
                <label className="form-label">Profile Photo</label>
                <input
                  type="file"
                  name="profile_photo"
                  className="form-control"
                  accept="image/*"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Password */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Confirm Password */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  name="password2"
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                />
              </div>

            </div>

            <button
              type="submit"
              className="btn btn-danger w-100 btn-lg mt-2"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-danger text-decoration-none fw-semibold"
              >
                Login
              </Link>
            </small>
          </div>

        </div>
      </div>
    </div>
  );
}