import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaSpinner, FaCheckCircle, FaEnvelope, FaClock, FaShieldAlt } from 'react-icons/fa';
import API from '@/api/axios';
import BrandLogo from "../components/BrandLogo";
import "../styles/auth-redesign.css";
import { markFunnelStage } from "../lib/attribution";
import { trackOTPVerified } from "../lib/metaPixel";

const OTP_VALIDITY_SECONDS = 600;

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();

  const userId = location.state?.userId || localStorage.getItem("unverified_user_id");
  const email = location.state?.email || localStorage.getItem("unverified_email");
  const initialExpiresIn = location.state?.expiresIn || OTP_VALIDITY_SECONDS;

  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(initialExpiresIn);
  const [canResend, setCanResend] = useState(false);
  const [emailSending, setEmailSending] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(60);
  const intervalRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    if (!userId) navigate('/login');
    const timer = setTimeout(() => setEmailSending(false), 3000);
    return () => clearTimeout(timer);
  }, [userId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [timeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    if (value && !/^\d+$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) document.getElementById(`otp-${index + 1}`).focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d+$/.test(pasteData) && pasteData.length === 4) {
      const digits = pasteData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, idx) => { if (idx < 4) newOtp[idx] = digit; });
      setOtp(newOtp);
      document.getElementById('otp-3')?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 4) { setError('Veuillez entrer le code à 4 chiffres'); return; }

    setLoading(true);
    setError('');
    try {
      const response = await API.post('users/verify-otp/', { user_id: userId, code });
      if (response.data.access || response.status === 200) {
        if (response.data.access) localStorage.setItem("access", response.data.access);
        if (response.data.refresh) localStorage.setItem("refresh", response.data.refresh);
        localStorage.setItem("nm_has_session", "1");
        sessionStorage.setItem("nm_user_session", "1");
      }
      localStorage.removeItem("unverified_user_id");
      localStorage.removeItem("unverified_email");
      if (response.data?.user?.id) {
        markFunnelStage(response.data.user.id, "otp_verified");
      }
      trackOTPVerified();
      setSuccess('Email vérifié avec succès ! Redirection…');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Code invalide. Veuillez réessayer.');
      setOtp(['', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) { setError(`Veuillez attendre ${resendCooldown}s avant de renvoyer.`); return; }
    setLoading(true); setError(''); setSuccess(''); setEmailSending(true);
    try {
      const response = await API.post('users/resend-otp/', { user_id: userId });
      setSuccess('Un nouveau code a été envoyé à votre email !');
      setTimeLeft(response.data?.expires_in || OTP_VALIDITY_SECONDS);
      setCanResend(false); setResendCooldown(60); setOtp(['', '', '', '']);
      setTimeout(() => setEmailSending(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Échec de l'envoi du code.");
      setEmailSending(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.every(digit => digit !== '') && !loading && !emailSending && timeLeft > 0) {
      handleVerify();
    }
  }, [otp]);

  return (
    <div className="auth-shell">
      <div className="auth-panel" style={{ maxWidth: "440px" }}>
        <div className="auth-brand">
          <BrandLogo height={40} />
        </div>

        <div className="auth-icon-circle">
          <FaEnvelope />
        </div>

        <h2 style={{ textAlign: "center", fontWeight: 800, fontSize: "1.5rem", color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
          Vérifiez votre email
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.9rem", lineHeight: "1.6", margin: "0 0 1.5rem" }}>
          {emailSending ? (
            <>Envoi du code à <strong>{email || "votre email"}</strong>…</>
          ) : (
            <>Code envoyé à <strong>{email || "votre email"}</strong>. Vérifiez vos spams.</>
          )}
        </p>

        {emailSending && (
          <div className="auth-alert info" style={{ textAlign: "center" }}>
            <FaSpinner style={{ animation: "spin 1s linear infinite", marginRight: "0.4rem" }} />
            Envoi en cours…
          </div>
        )}

        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        <div style={{ marginBottom: "1.25rem" }}>
          <label className="auth-label" style={{ marginBottom: "0.75rem" }}>
            Code à 4 chiffres
          </label>
          <div className="otp-grid">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                className={`otp-box ${error ? "has-error" : ""}`}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                disabled={emailSending || loading || timeLeft <= 0}
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <div className="otp-security-info">
            <FaShieldAlt style={{ color: "#64748b", marginRight: "0.4rem" }} />
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Règles de sécurité</span>
            <ul>
              <li>Code valable <strong>10 minutes</strong> seulement</li>
              <li>Utilisable <strong>une seule fois</strong></li>
              <li><strong>5 tentatives</strong> maximum</li>
              <li>Un nouveau code invalide l'ancien</li>
            </ul>
          </div>
        </div>

        <div className="otp-timer">
          <span className={`otp-timer-text ${timeLeft <= 60 ? "urgent" : ""}`}>
            <FaClock />
            {timeLeft > 0 ? `Expire dans ${formatTime(timeLeft)}` : "Code expiré"}
          </span>
          <button
            className="otp-resend-btn"
            onClick={handleResend}
            disabled={loading || emailSending || resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : "Renvoyer le code"}
          </button>
        </div>

        <button
          className="nm-btn-primary"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 4 || emailSending || timeLeft <= 0}
        >
          {loading ? "Vérification…" : "Vérifier mon email"}
        </button>
      </div>
    </div>
  );
}
