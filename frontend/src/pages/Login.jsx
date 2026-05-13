import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "@/api/axios";
import BrandLogo from "../components/BrandLogo";
import loginMeetingImage from "../assets/marketing/login-meeting.png";
import "../styles/auth-redesign.css";
import { useI18n } from "../context/I18nContext";
import { trackLoginSuccess } from "../lib/metaPixel";

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      localStorage.removeItem("admin_access");
      localStorage.removeItem("admin_refresh");
      localStorage.removeItem("admin_email");

      const response = await API.post("users/login/", formData);
      const accessToken = response.data?.access;
      if (!accessToken || accessToken.split(".").length !== 3) {
        throw new Error("Invalid login response. Please try again.");
      }

      localStorage.setItem("access", accessToken);
      if (response.data?.refresh) localStorage.setItem("refresh", response.data.refresh);
      localStorage.setItem("nm_has_session", "1");
      sessionStorage.setItem("nm_user_session", "1");
      trackLoginSuccess();
      navigate("/dashboard");
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        setErrorMessage(
          error.response?.data?.detail ||
          error.response?.data?.error ||
          error.response?.data?.non_field_errors?.[0] ||
          t("login.errorInvalidCredentials")
        );
      } else if (error.response?.data?.detail) {
        setErrorMessage(error.response.data.detail);
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else if (error.response?.data?.non_field_errors?.[0]) {
        setErrorMessage(error.response.data.non_field_errors[0]);
      } else if (error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t("login.errorGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Photo Panel ── */}
      <div className="auth-photo-panel">
        <img
          className="auth-photo-bg"
          src={loginMeetingImage}
          alt=""
        />
        <div className="auth-photo-overlay" />
        <div className="auth-photo-top">
          <BrandLogo height={34} style={{ filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="auth-photo-bottom">
          <blockquote>"Chaque échange utile commence par une bonne première impression."</blockquote>
          <cite>— L'esprit NouMatch</cite>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <Link to="/" className="auth-form-logo">
            <BrandLogo height={40} />
          </Link>

          <h1 className="auth-form-title">Bon retour.</h1>
          <p className="auth-form-subtitle">Retrouvez vos connexions et continuez votre parcours.</p>

          {errorMessage && <div className="auth-alert error">{errorMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">{t("login.email")}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="auth-input"
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <span>{t("login.password")}</span>
                <Link to="/forgot-password" className="auth-label-link">
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="auth-input"
                placeholder="••••••••"
                required
              />
            </div>

            <div style={{ marginTop: "1.75rem" }}>
              <button
                type="submit"
                className="nm-btn-primary"
                disabled={loading}
              >
                {loading ? t("login.submitting") : t("login.submit")}
              </button>
            </div>
          </form>

          <div className="text-center mt-4" style={{ color: "#64748b", fontSize: "0.9rem" }}>
            {t("login.noAccount")}{" "}
            <Link to="/register" className="auth-link">{t("login.register")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
