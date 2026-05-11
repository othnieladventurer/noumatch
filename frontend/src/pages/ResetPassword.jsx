import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaLock } from "react-icons/fa";
import API from "@/api/axios";
import BrandLogo from "../components/BrandLogo";
import "../styles/auth-redesign.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await API.post("users/reset-password/", {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      navigate("/reset-password-done");
    } catch (err) {
      setError(err.response?.data?.detail || "Lien invalide ou expiré.");
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
          <FaLock />
        </div>

        <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: "1.5rem", color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
          Nouveau mot de passe
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.92rem", lineHeight: "1.6", margin: "0 0 1.75rem" }}>
          Choisissez un mot de passe sécurisé pour protéger votre compte.
        </p>

        {error && <div className="auth-alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Nouveau mot de passe</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirmer le mot de passe</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <button className="nm-btn-primary" disabled={loading}>
              {loading ? "Mise à jour…" : "Mettre à jour"}
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
