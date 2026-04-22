import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "@/api/axios";
import "../styles/auth-redesign.css";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const response = await API.post("users/login/", formData);
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      navigate("/dashboard");
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        setErrorMessage("Email ou mot de passe incorrect");
      } else if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail);
      } else {
        setErrorMessage("Connexion impossible. Veuillez reessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <h1>
            <FaHeart className="text-danger me-2" />
            NouMatch
          </h1>
          <p>Connectez-vous a votre compte</p>
        </div>

        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control form-control-lg"
              placeholder="email@exemple.com"
              required
            />
          </div>

          <div className="mb-2">
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

          <div className="text-end mb-3">
            <Link to="/forgot-password" className="auth-link">
              Mot de passe oublie ?
            </Link>
          </div>

          <button type="submit" className="btn btn-danger btn-lg w-100 auth-btn" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="text-center mt-3 text-muted">
          Pas encore de compte ? <Link to="/register" className="auth-link">S'inscrire</Link>
        </div>
      </div>
    </div>
  );
}
