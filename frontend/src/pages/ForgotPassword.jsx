import { FaHeart } from "react-icons/fa";
import "../styles/auth.css";

export default function ForgotPassword() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h1 className="brand">
            <FaHeart className="text-danger me-2" />
            <span className="text-primary">NouMatch</span>
          </h1>
          <p className="text-muted">Reset your password</p>
        </div>

        <form>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="you@example.com"
              required
            />
          </div>

          <button className="btn btn-danger w-100 btn-lg">
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}




