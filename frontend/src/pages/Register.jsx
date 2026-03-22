// src/pages/Register.jsx
import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import API from '@/api/axios';

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [detectingCountry, setDetectingCountry] = useState(true);
  const [countryCode, setCountryCode] = useState(""); // Store country code for flag
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    birth_date: "",
    password: "",
    password2: "",
    gender: "",
    profile_photo: null,
    country: "", // Country name
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-detect user's country on component mount
  useEffect(() => {
    detectUserCountry();
  }, []);

  const detectUserCountry = async () => {
    try {
      setDetectingCountry(true);
      
      // Using ipapi.co (free, no API key required for basic usage)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.country_name) {
        setFormData(prev => ({ ...prev, country: data.country_name }));
        setCountryCode(data.country_code.toLowerCase()); // Store country code for flag
        console.log("📍 Country detected:", data.country_name, data.country_code);
      } else {
        // Fallback to a default or empty
        setFormData(prev => ({ ...prev, country: "" }));
        setCountryCode("");
      }
    } catch (error) {
      console.error("Error detecting country:", error);
      // Fallback to empty on error
      setFormData(prev => ({ ...prev, country: "" }));
      setCountryCode("");
    } finally {
      setDetectingCountry(false);
    }
  };

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
      if (!formData.gender) {
        setErrorMessage("Please select your gender");
        return;
      }
    }

    if (step === 3) {
      if (!formData.profile_photo) {
        setErrorMessage("Profile photo is required");
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

    // Final validation for profile photo
    if (!formData.profile_photo) {
      setErrorMessage("Profile photo is required");
      return;
    }

    const data = new FormData();
    data.append("first_name", formData.first_name);
    data.append("last_name", formData.last_name);
    data.append("email", formData.email);
    data.append("birth_date", formData.birth_date);
    data.append("gender", formData.gender);
    data.append("password", formData.password);
    data.append("password2", formData.password2);
    data.append("country", formData.country);

    if (formData.profile_photo) {
      data.append("profile_photo", formData.profile_photo);
    }

    // Log FormData contents for debugging
    console.log("Submitting form data:");
    for (let pair of data.entries()) {
      console.log(pair[0] + ': ' + (pair[0].includes('password') ? '***' : pair[1]));
    }

    setLoading(true);

    try {
      const response = await API.post("users/register/", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Save tokens
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      // Redirect to dashboard
      navigate("/dashboard");
      
    } catch (error) {
      console.error("Registration error:", error);
      
      // Handle error response
      if (error.response) {
        // Server responded with error
        let message = "";
        if (typeof error.response.data === "object") {
          for (let key in error.response.data) {
            message += `${key}: ${error.response.data[key]}\n`;
          }
        } else {
          message = error.response.data || "Registration failed";
        }
        setErrorMessage(message);
        console.error("Registration error response:", error.response.data);
      } else if (error.request) {
        // Request made but no response
        setErrorMessage("Network error. Please try again.");
      } else {
        // Something else happened
        setErrorMessage("An error occurred. Please try again.");
      }
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
              <small>Gender</small>
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

                {/* Country Field with Real Flag - Unclickable, displayed under email */}
                <div className="col-12 mb-3">
                  <label className="form-label">Country</label>
                  <div className="position-relative">
                    <div className="d-flex align-items-center">
                      {countryCode && !detectingCountry && (
                        <img 
                          src={`https://flagcdn.com/w40/${countryCode}.png`}
                          srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
                          width="30"
                          height="22.5"
                          alt={`${formData.country} flag`}
                          style={{ 
                            marginRight: "10px",
                            borderRadius: "4px",
                            objectFit: "cover",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <input
                        type="text"
                        name="country"
                        className="form-control form-control-lg bg-light"
                        placeholder={detectingCountry ? "Detecting location..." : "Country not detected"}
                        value={formData.country || ""}
                        readOnly
                        disabled
                        style={{ 
                          borderRadius: "16px",
                          cursor: "not-allowed",
                          opacity: 0.9,
                          color: "#495057",
                          backgroundColor: "#e9ecef",
                          flex: 1
                        }}
                      />
                    </div>
                    {detectingCountry && (
                      <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                        <div className="spinner-border spinner-border-sm text-secondary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <small className="text-muted">Auto-detected from your location</small>
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

            {/* STEP 2: Gender Only */}
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
                  </select>
                </div>

                <input type="hidden" name="country" value={formData.country} />
              </div>
            )}

            {/* STEP 3: Profile Photo (Required) */}
            {step === 3 && (
              <div className="row">
                <div className="col-12 mb-3">
                  <label className="form-label">
                    Profile Photo <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    name="profile_photo"
                    className="form-control form-control-lg"
                    accept="image/*"
                    onChange={handleChange}
                    required
                    style={{ 
                      borderRadius: "16px",
                      borderColor: formData.profile_photo ? "#28a745" : "#e9ecef"
                    }}
                  />
                  <small className="text-muted">
                    Upload a clear photo of yourself (required)
                  </small>
                  
                  {formData.profile_photo ? (
                    <div className="mt-2 text-success">
                      <i className="fas fa-check-circle me-1"></i>
                      Photo selected: {formData.profile_photo.name}
                    </div>
                  ) : (
                    <div className="mt-2 text-danger">
                      <i className="fas fa-exclamation-circle me-1"></i>
                      Profile photo is required
                    </div>
                  )}

                  {/* Preview selected image */}
                  {formData.profile_photo && (
                    <div className="mt-3 text-center">
                      <img
                        src={URL.createObjectURL(formData.profile_photo)}
                        alt="Preview"
                        className="rounded-circle"
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                          border: "3px solid #ff4d6d"
                        }}
                      />
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
                  type="submit"
                  className="btn btn-danger w-100 btn-lg"
                  disabled={loading || !formData.profile_photo}
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