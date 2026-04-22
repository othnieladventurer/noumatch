import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '@/api/axios';
import { FaHeart, FaSpinner, FaCheckCircle, FaEnvelope, FaClock, FaShieldAlt } from 'react-icons/fa';
import "../styles/auth-redesign.css";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get userId from location state OR from localStorage (for returning unverified users)
  const userId = location.state?.userId || localStorage.getItem("unverified_user_id");
  const email = location.state?.email || localStorage.getItem("unverified_email");

  const [otp, setOtp] = useState(['', '', '', '']); // Changed to 4 digits
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // Changed to 5 minutes (300 seconds)
  const [canResend, setCanResend] = useState(false);
  const [emailSending, setEmailSending] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const intervalRef = useRef(null);
  const cooldownRef = useRef(null);

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
    
    // Simulate email delivery (actual email arrives in 2-5 seconds)
    const timer = setTimeout(() => {
      setEmailSending(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [userId, navigate]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
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
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
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
      digits.forEach((digit, idx) => {
        if (idx < 4) newOtp[idx] = digit;
      });
      setOtp(newOtp);
      document.getElementById('otp-3')?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 4) {
      setError('Veuillez entrer le code à 4 chiffres');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await API.post('users/verify-otp/', {
        user_id: userId,
        code: code,
      });
      
      // Store tokens
      if (response.data.access) {
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
      }
      
      // Clear unverified user data
      localStorage.removeItem("unverified_user_id");
      localStorage.removeItem("unverified_email");
      
      setSuccess('Email vérifié avec succès ! Redirection...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Code invalide. Veuillez réessayer.';
      setError(errorMsg);
      
      // Clear OTP fields on error
      setOtp(['', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      setError(`Veuillez attendre ${resendCooldown} secondes avant de renvoyer un code`);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setEmailSending(true);
    
    try {
      await API.post('users/resend-otp/', { user_id: userId });
      setSuccess('Un nouveau code a été envoyé à votre email !');
      setTimeLeft(300); // Reset to 5 minutes
      setCanResend(false);
      setResendCooldown(60); // 60 seconds cooldown
      setOtp(['', '', '', '']); // Clear OTP fields
      
      setTimeout(() => {
        setEmailSending(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l\'envoi du code.');
      setEmailSending(false);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all 4 digits are entered
  useEffect(() => {
    if (otp.every(digit => digit !== '') && !loading && !emailSending && timeLeft > 0) {
      handleVerify();
    }
  }, [otp]);

  return (
    <div className="auth-shell">

      <div
        className="auth-panel"
        style={{ width: "100%", maxWidth: "450px" }}
      >
        <div className="text-center mb-4">
          <h1 className="d-flex justify-content-center align-items-center fw-bold">
            <FaHeart className="text-danger me-2" />
            <span className="text-primary">NouMatch</span>
          </h1>
          <p className="text-muted">Vérifiez votre email</p>
        </div>

        {emailSending ? (
          <div className="alert alert-info rounded-3 text-center">
            <FaSpinner className="me-2" style={{ animation: 'spin 1s linear infinite' }} />
            Envoi du code de vérification à <strong>{email || 'votre email'}</strong>...
            <br />
            <small className="text-muted">Devrait arriver dans quelques secondes</small>
          </div>
        ) : (
          <div className="alert alert-success rounded-3 text-center">
            <FaCheckCircle className="me-2" />
            Code envoyé à <strong>{email || 'votre email'}</strong>
            <br />
            <small className="text-muted">Vérifiez votre boîte de réception (ou les spams)</small>
          </div>
        )}

        {error && (
          <div className="alert alert-danger rounded-3">{error}</div>
        )}
        {success && (
          <div className="alert alert-success rounded-3">{success}</div>
        )}

        <div className="mb-4">
          <label className="form-label">Entrez le code à 4 chiffres</label>
          <div className="d-flex justify-content-between gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                maxLength="1"
                className="form-control text-center"
                style={{ 
                  fontSize: '2rem', 
                  width: '70px',
                  height: '80px',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  border: error ? '2px solid #dc3545' : '2px solid #e9ecef'
                }}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                disabled={emailSending || loading || timeLeft <= 0}
                autoFocus={idx === 0}
              />
            ))}
          </div>
          
          <div className="mt-3 text-center">
            <div className="alert alert-warning rounded-3 p-2" style={{ fontSize: '0.8rem' }}>
              <FaShieldAlt className="me-2" />
              <strong>Règles de sécurité :</strong>
              <ul className="mt-2 mb-0 text-start small">
                <li>✓ Code valable <strong>5 minutes</strong> seulement</li>
                <li>✓ Utilisable <strong>une seule fois</strong></li>
                <li>✓ <strong>5 tentatives</strong> maximum</li>
                <li>✓ Un nouveau code invalide l'ancien</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className={`${timeLeft <= 60 ? 'text-danger fw-bold' : 'text-muted'}`}>
            <FaClock className="me-1" />
            {timeLeft > 0 ? (
              `Code expire dans ${formatTime(timeLeft)}`
            ) : (
              'Code expiré - veuillez en demander un nouveau'
            )}
          </span>
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={handleResend}
            disabled={loading || (!canResend && timeLeft > 0) || emailSending || resendCooldown > 0}
          >
            {resendCooldown > 0 
              ? `Renvoyer (${resendCooldown}s)` 
              : 'Renvoyer le code'}
          </button>
        </div>

        <button
          className="btn btn-danger w-100 btn-lg"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 4 || emailSending || timeLeft <= 0}
          style={{ borderRadius: '16px' }}
        >
          {loading ? 'Vérification...' : 'Vérifier mon email'}
        </button>

        <div className="text-center mt-3">
          <small className="text-muted">
            <FaEnvelope className="me-1" />
            Vous n'avez pas reçu le code ? Vérifiez vos spams
          </small>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
