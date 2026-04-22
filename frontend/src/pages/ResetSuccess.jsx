import { FaHeart } from "react-icons/fa";
import { Link } from "react-router-dom";
import "../styles/auth-redesign.css";

export default function ResetSuccess() {
  return (
    <div className="auth-shell">
      <div className="auth-panel text-center">
        <div className="auth-brand">
          <h1>
            <FaHeart className="text-danger me-2" /> NouMatch
          </h1>
          <p>Mot de passe mis a jour</p>
        </div>

        <div className="alert alert-success mb-3">
          Votre mot de passe a ete modifie avec succes.
        </div>

        <p className="text-muted">Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.</p>

        <Link to="/login" className="btn btn-danger w-100 auth-btn mt-2">
          Aller a la connexion
        </Link>
      </div>
    </div>
  );
}
