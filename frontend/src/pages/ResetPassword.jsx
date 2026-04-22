import { useState } from "react";
import { FaHeart } from "react-icons/fa";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "@/api/axios";
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
      setError(err.response?.data?.detail || "Lien invalide ou expire.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <h1>
            <FaHeart className="text-danger me-2" /> NouMatch
          </h1>
          <p>Creer un nouveau mot de passe</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Nouveau mot de passe</label>
            <input
              type="password"
              className="form-control form-control-lg"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              type="password"
              className="form-control form-control-lg"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-danger btn-lg w-100 auth-btn" disabled={loading}>
            {loading ? "Mise a jour..." : "Mettre a jour"}
          </button>
        </form>

        <div className="text-center mt-3">
          <Link to="/login" className="auth-link">Retour a la connexion</Link>
        </div>
      </div>
    </div>
  );
}
