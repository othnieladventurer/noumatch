import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "../styles/auth.css";

export default function VerifySuccess() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card text-center">
        <div className="d-flex justify-content-center mb-3">
          <BrandLogo height={42} />
        </div>

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



