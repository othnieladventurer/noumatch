import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
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

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

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

    // Frontend validation for age
    const age = calculateAge(formData.birth_date);
    if (age < 18) {
      setErrorMessage("You must be at least 18 years old to register.");
      return;
    }

    if (formData.password !== formData.password2) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const data = new FormData();
    data.append("first_name", formData.first_name);
    data.append("last_name", formData.last_name);
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
          body: data,
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

              {/* First Name */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-control form-control-lg"
                  placeholder="Enter your first name"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Last Name */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-control form-control-lg"
                  placeholder="Enter your last name"
                  required
                  onChange={handleChange}
                />
              </div>

              {/* Email */}
              <div className="col-12 mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control form-control-lg"
                  placeholder="Enter your email address"
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
                <small className="text-muted">You must be 18 or older to register</small>
              </div>

              {/* Gender */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Gender</label>
                <select
                  name="gender"
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                  defaultValue=""
                >
                  <option value="" disabled>Select your gender</option>
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
                  className="form-control form-control-lg"
                  required
                  onChange={handleChange}
                  defaultValue=""
                >
                  <option value="" disabled>Select your preference</option>
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
                  className="form-control form-control-lg"
                  accept="image/*"
                  required
                  onChange={handleChange}
                />
                <small className="text-muted">Upload a clear photo of yourself</small>
              </div>

              {/* Password */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control form-control-lg"
                  placeholder="Create a password"
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
                  placeholder="Confirm your password"
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