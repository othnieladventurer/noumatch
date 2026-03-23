import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '@/api/axios';
import { FaHeart } from 'react-icons/fa';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = location.state?.userId;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef(null);

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      navigate('/register');
    }
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

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle OTP input change
  const handleChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next field
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  // Handle paste
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
      // Focus last field
      document.getElementById('otp-5')?.focus();
    }
  };

  // Verify OTP
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
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
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      navigate('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await API.post('users/resend-otp/', { user_id: userId });
      setSuccess('New code sent to your email!');
      setTimeLeft(600);
      setCanResend(false);
    } catch (err) {
      console.error('Resend error:', err);
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        backgroundImage:
          "url('https://img.freepik.com/free-photo/romantic-black-couple-sitting-restaurant-wearing-elegant-clothes_1157-51961.jpg?semt=ais_user_personalization&w=740&q=80')",
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
          <p className="text-muted">Verify your email</p>
        </div>

        {error && (
          <div className="alert alert-danger rounded-3">{error}</div>
        )}
        {success && (
          <div className="alert alert-success rounded-3">{success}</div>
        )}

        <div className="mb-4">
          <label className="form-label">Enter the 6‑digit code sent to your email</label>
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
              />
            ))}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className="text-muted">
            {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
          </span>
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={handleResend}
            disabled={loading || !canResend}
          >
            Resend code
          </button>
        </div>

        <button
          className="btn btn-danger w-100 btn-lg"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          style={{ borderRadius: '16px' }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </div>
    </div>
  );
}



