import { FaHeart } from "react-icons/fa";
import "../styles/auth.css";

export default function ResetPassword() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h1 className="brand">
            <FaHeart className="text-danger me-2" />
            <span className="text-primary">NouMatch</span>
          </h1>
          <p className="text-muted">Create a new password</p>
        </div>

        <form>
          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control form-control-lg"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control form-control-lg"
              required
            />
          </div>

          <button className="btn btn-danger w-100 btn-lg">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
