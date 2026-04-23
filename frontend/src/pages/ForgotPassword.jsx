import { useState } from "react";
import { Link } from "react-router-dom";
import API from "@/api/axios";
import BrandLogo from "../components/BrandLogo";
import "../styles/auth-redesign.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const response = await API.post("users/forgot-password/", { email });
      setSuccess(response.data.detail || "Un email de reinitialisation a ete envoye.");
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'envoyer l'email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="d-flex justify-content-center mb-2">
            <BrandLogo height={42} />
          </div>
          <p>Reinitialiser votre mot de passe</p>
        </div>

        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-danger btn-lg w-100 auth-btn" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <div className="text-center mt-3">
          <Link to="/login" className="auth-link">Retour a la connexion</Link>
        </div>
      </div>
    </div>
  );
}
