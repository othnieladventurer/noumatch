import { useState } from "react";
import { Link } from "react-router-dom";
import { FaKey } from "react-icons/fa";
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
      setSuccess(response.data.detail || "Un email de réinitialisation a été envoyé.");
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
          <Link to="/">
            <BrandLogo height={40} />
          </Link>
        </div>

        <div className="auth-icon-circle">
          <FaKey />
        </div>

        <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: "1.5rem", color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
          Mot de passe oublié ?
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.92rem", lineHeight: "1.6", margin: "0 0 1.75rem" }}>
          Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
        </p>

        {success && <div className="auth-alert success">{success}</div>}
        {error && <div className="auth-alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Adresse email</label>
            <input
              type="email"
              className="auth-input"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <button className="nm-btn-primary" disabled={loading}>
              {loading ? "Envoi en cours…" : "Envoyer le lien"}
            </button>
          </div>
        </form>

        <div className="text-center mt-3" style={{ fontSize: "0.9rem" }}>
          <Link to="/login" className="auth-link">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
