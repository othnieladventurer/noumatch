import { FaHeart } from "react-icons/fa";
import { Link } from "react-router-dom";
import "../styles/auth.css";

export default function ResetSuccess() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card text-center">
        <h1 className="brand mb-3">
          <FaHeart className="text-danger me-2" />
          <span className="text-primary">NouMatch</span>
        </h1>

        <h4 className="text-success">Password Reset Successful</h4>
        <p className="text-muted">
          You can now log in with your new password.
        </p>

        <Link to="/login" className="btn btn-danger w-100 mt-3">
          Go to Login
        </Link>
      </div>
    </div>
  );
}



