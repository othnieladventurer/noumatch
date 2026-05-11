import { Link } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import BrandLogo from "../components/BrandLogo";
import "../styles/auth-redesign.css";

export default function ResetSuccess() {
  return (
    <div className="auth-shell">
      <div className="auth-panel text-center">
        <div className="auth-brand">
          <Link to="/">
            <BrandLogo height={40} />
          </Link>
        </div>

        <div className="auth-icon-circle success">
          <FaCheckCircle />
        </div>

        <h2 style={{ fontWeight: 800, fontSize: "1.5rem", color: "#0f172a", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>
          Mot de passe mis à jour
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.92rem", lineHeight: "1.65", margin: "0 0 1.75rem" }}>
          Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.
        </p>

        <Link to="/login" className="nm-btn-primary" style={{ display: "flex" }}>
          Aller à la connexion
        </Link>
      </div>
    </div>
  );
}
