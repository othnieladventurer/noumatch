import { FaHeart } from "react-icons/fa";
import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function VerifySuccess() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card text-center">
        <h1 className="brand mb-3">
          <FaHeart className="text-danger me-2" />
          <span className="text-primary">NouMatch</span>
        </h1>

        <h4 className="mb-3 text-success">Email Verified 🎉</h4>
        <p className="text-muted">
          Your account has been successfully verified.
        </p>

        <Link to="/login" className="btn btn-danger w-100 mt-3">
          Continue to Login
        </Link>
      </div>
    </div>
  );
}



