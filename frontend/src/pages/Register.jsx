import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    birth_date: "",
    password: "",
    password2: "",
    gender: "",
    interested_in: "",
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

  // Handle Enter key press - completely disable on step 3
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < 3) {
        nextStep();
      }
      // On step 3, Enter does absolutely nothing
    }
  };

  const nextStep = () => {
    setErrorMessage("");

    // Validate current step before proceeding
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.birth_date || !formData.password || !formData.password2) {
        setErrorMessage("Please fill in all fields");
        return;
      }
      
      const age = calculateAge(formData.birth_date);
      if (age < 18) {
        setErrorMessage("You must be at least 18 years old to register.");
        return;
      }

      if (formData.password !== formData.password2) {
        setErrorMessage("Passwords do not match.");
        return;
      }
    }

    if (step === 2) {
      if (!formData.gender || !formData.interested_in) {
        setErrorMessage("Please select your gender and preference");
        return;
      }
    }

    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only allow submit on step 3 via button click
    if (step !== 3) {
      return;
    }
    
    setErrorMessage("");

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

  // Progress bar width based on step
  const progressWidth = `${(step / 3) * 100}%`;

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
          maxHeight: "600px",
          overflow: "hidden",
          borderRadius: "24px !important",
        }}
      >
        <div 
          className="card-body"
          style={{
            height: "100%",
            overflowY: "auto",
            padding: "1.5rem",
            borderRadius: "24px",
          }}
        >
          {/* Branding */}
          <div className="text-center mb-4">
            <h1 className="d-flex justify-content-center align-items-center fw-bold">
              <FaHeart className="text-danger me-2" />
              <span className="text-primary">NouMatch</span>
            </h1>
            <p className="text-muted mb-0">Create your account</p>
          </div>

          {/* Progress Bar */}
          <div className="progress mb-4" style={{ height: "8px", borderRadius: "20px" }}>
            <div
              className="progress-bar bg-danger"
              role="progressbar"
              style={{ 
                width: progressWidth, 
                borderRadius: "20px",
                transition: "width 0.3s ease"
              }}
              aria-valuenow={step}
              aria-valuemin="0"
              aria-valuemax="3"
            ></div>
          </div>

          {/* Step Indicators */}
          <div className="d-flex justify-content-between mb-4">
            <div className={`text-center ${step >= 1 ? 'text-danger' : 'text-muted'}`}>
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${step >= 1 ? 'bg-danger text-white' : 'bg-light'}`} 
                style={{ width: "30px", height: "30px", borderRadius: "50% !important" }}
              >
                1
              </div>
              <small>Basic Info</small>
            </div>
            <div className={`text-center ${step >= 2 ? 'text-danger' : 'text-muted'}`}>
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${step >= 2 ? 'bg-danger text-white' : 'bg-light'}`} 
                style={{ width: "30px", height: "30px", borderRadius: "50% !important" }}
              >
                2
              </div>
              <small>Preferences</small>
            </div>
            <div className={`text-center ${step >= 3 ? 'text-danger' : 'text-muted'}`}>
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${step >= 3 ? 'bg-danger text-white' : 'bg-light'}`} 
                style={{ width: "30px", height: "30px", borderRadius: "50% !important" }}
              >
                3
              </div>
              <small>Photo</small>
            </div>
          </div>

          {errorMessage && (
            <div className="alert alert-danger white-space-pre-wrap" style={{ borderRadius: "16px" }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="row">
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    className="form-control form-control-lg"
                    placeholder="Enter your first name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    className="form-control form-control-lg"
                    placeholder="Enter your last name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control form-control-lg"
                    placeholder="Enter your email address"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Birth Date</label>
                  <input
                    type="date"
                    name="birth_date"
                    className="form-control form-control-lg"
                    required
                    value={formData.birth_date}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  />
                  <small className="text-muted">You must be 18 or older to register</small>
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control form-control-lg"
                    placeholder="Create a password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="password2"
                    className="form-control form-control-lg"
                    placeholder="Confirm your password"
                    required
                    value={formData.password2}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Preferences */}
            {step === 2 && (
              <div className="row">
                <div className="col-12 mb-3">
                  <label className="form-label">Gender</label>
                  <select
                    name="gender"
                    className="form-control form-control-lg"
                    required
                    onChange={handleChange}
                    value={formData.gender}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  >
                    <option value="" disabled>Select your gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Interested In</label>
                  <select
                    name="interested_in"
                    className="form-control form-control-lg"
                    required
                    onChange={handleChange}
                    value={formData.interested_in}
                    onKeyPress={handleKeyPress}
                    style={{ borderRadius: "16px" }}
                  >
                    <option value="" disabled>Select your preference</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="everyone">Everyone</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 3: Profile Photo (Optional) */}
            {step === 3 && (
              <div className="row">
                <div className="col-12 mb-3">
                  <label className="form-label">Profile Photo (Optional)</label>
                  <input
                    type="file"
                    name="profile_photo"
                    className="form-control form-control-lg"
                    accept="image/*"
                    onChange={handleChange}
                    // No onKeyPress for file input
                    style={{ borderRadius: "16px" }}
                  />
                  <small className="text-muted">Upload a clear photo of yourself (you can skip this step)</small>
                  
                  {formData.profile_photo && (
                    <div className="mt-2 text-success">
                      <i className="fas fa-check-circle me-1"></i>
                      Photo selected: {formData.profile_photo.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="d-flex gap-2 mt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn btn-outline-secondary w-50"
                  disabled={loading}
                  style={{ borderRadius: "16px" }}
                >
                  Back
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className={`btn btn-danger ${step > 1 ? 'w-50' : 'w-100'}`}
                  disabled={loading}
                  style={{ borderRadius: "16px" }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button" // Changed from "submit" to "button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                  className="btn btn-danger w-100 btn-lg"
                  disabled={loading}
                  style={{ borderRadius: "16px" }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              )}
            </div>
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