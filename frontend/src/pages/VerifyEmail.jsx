import { FaHeart } from "react-icons/fa";
import "../styles/auth.css";

export default function VerifyEmail() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h1 className="brand">
            <FaHeart className="text-danger me-2" />
            <span className="text-primary">NouMatch</span>
          </h1>
          <p className="text-muted">Verify your email</p>
        </div>

        <form>
          <div className="mb-3">
            <label className="form-label">Verification Code</label>
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="Enter 6-digit code"
              required
            />
          </div>

          <button className="btn btn-danger w-100 btn-lg">
            Verify Email
          </button>
        </form>
      </div>
    </div>
  );
}
