import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '@/api/axios';
import { FaHeart, FaSpinner, FaCheckCircle, FaEnvelope, FaClock } from 'react-icons/fa';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get userId from location state OR from localStorage (for returning unverified users)
  const userId = location.state?.userId || localStorage.getItem("unverified_user_id");
  const email = location.state?.email || localStorage.getItem("unverified_email");

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(90);
  const [canResend, setCanResend] = useState(false);
  const [emailSending, setEmailSending] = useState(true);
  const intervalRef = useRef(null);

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

  // Countdown timer
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

  const formatTime = (seconds) => {
    if (seconds <= 90) {
      return `${seconds} seconde${seconds !== 1 ? 's' : ''}`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pasteData)) {
      const digits = pasteData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        if (idx < 6) newOtp[idx] = digit;
      });
      setOtp(newOtp);
      document.getElementById('otp-5')?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres');
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
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.error || 'Code invalide. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setEmailSending(true);
    
    try {
      await API.post('users/resend-otp/', { user_id: userId });
      setSuccess('Un nouveau code a été envoyé à votre email !');
      setTimeLeft(90);
      setCanResend(false);
      
      setTimeout(() => {
        setEmailSending(false);
      }, 3000);
    } catch (err) {
      console.error('Resend error:', err);
      setError(err.response?.data?.error || 'Échec de l\'envoi du code.');
      setEmailSending(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        backgroundImage: "url('https://img.freepik.com/free-photo/romantic-black-couple-sitting-restaurant-wearing-elegant-clothes_1157-51961.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "1rem",
      }}
    >
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      ></div>

      <div
        className="card shadow-lg border-0 rounded-4 p-4 position-relative"
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
          <label className="form-label">Entrez le code à 6 chiffres</label>
          <div className="d-flex justify-content-between gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                maxLength="1"
                className="form-control text-center"
                style={{ fontSize: '1.5rem', width: '60px' }}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onPaste={idx === 0 ? handlePaste : undefined}
                disabled={emailSending}
              />
            ))}
          </div>
          <div className="mt-2 text-center">
            <small className="text-warning">
              <FaClock className="me-1" />
              ⚠️ Le code expire dans 90 secondes pour des raisons de sécurité
            </small>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className={`${timeLeft <= 30 ? 'text-danger fw-bold' : 'text-muted'}`}>
            {timeLeft > 0 ? (
              <>
                <FaClock className="me-1" />
                Le code expire dans {formatTime(timeLeft)}
              </>
            ) : (
              'Code expiré - veuillez en demander un nouveau'
            )}
          </span>
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={handleResend}
            disabled={loading || !canResend || emailSending}
          >
            Renvoyer le code
          </button>
        </div>

        <button
          className="btn btn-danger w-100 btn-lg"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6 || emailSending}
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