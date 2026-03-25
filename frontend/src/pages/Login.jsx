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
      const response = await API.post("users/login/", formData);
      
      // Store tokens
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      
      // Get user info to check verification status
      const userResponse = await API.get("users/me/");
      const user = userResponse.data;
      
      console.log("User verification status:", user.is_verified);
      
      if (user.is_verified === true) {
        // Verified user - go to dashboard
        navigate("/dashboard");
      } else {
        // Unverified user - store info and redirect to OTP
        localStorage.setItem("unverified_user_id", user.id);
        localStorage.setItem("unverified_email", user.email);
        navigate("/verify-otp");
      }
      
    } catch (error) {
      console.error("Erreur de connexion:", error);
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 404) {
          setErrorMessage("Email ou mot de passe incorrect");
        } else {
          let message = "";
          if (typeof error.response.data === "object") {
            for (let key in error.response.data) {
              message += `${key}: ${error.response.data[key]}\n`;
            }
          } else {
            message = error.response.data || "Échec de la connexion";
          }
          setErrorMessage(message);
        }
      } else if (error.request) {
        setErrorMessage("Erreur réseau ou serveur. Veuillez réessayer.");
      } else {
        setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
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
      {/* Overlay sombre */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      ></div>

      {/* Carte de connexion */}
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
            <p className="text-muted mb-0">Trouvez votre âme sœur</p>
          </div>

          {/* Message d'erreur */}
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
                placeholder="vous@exemple.com"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control form-control-lg"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-danger w-100 btn-lg"
              disabled={loading}
            >
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Vous n'avez pas de compte ?{" "}
              <Link
                to="/register"
                className="text-danger text-decoration-none fw-semibold"
              >
                S'inscrire
              </Link>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}