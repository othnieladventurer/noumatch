import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import API from '@/api/axios';
import BrandLogo from "../components/BrandLogo";
import "../styles/auth-redesign.css";
import { useI18n } from "../context/I18nContext";

export default function Register() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [countryCode, setCountryCode] = useState("ht");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    birth_date: "",
    password: "",
    password2: "",
    gender: "",
    profile_photo: null,
    country: "Haiti",
    city: "",
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [emailSuccessMessage, setEmailSuccessMessage] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const emailTimeoutRef = useRef(null);

  const [canRegister, setCanRegister] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState("");

  useEffect(() => {
    const { first_name, last_name, email, birth_date, password, password2 } = formData;
    const age = calculateAge(birth_date);
    const isEmailValidFormat = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email);
    const isValid =
      first_name.trim() !== "" &&
      last_name.trim() !== "" &&
      email.trim() !== "" &&
      birth_date !== "" &&
      password !== "" &&
      password2 !== "" &&
      age >= 18 &&
      password === password2 &&
      isEmailValidFormat &&
      emailAvailable;
    setStep1Valid(isValid);
  }, [formData, emailAvailable]);

  useEffect(() => {
    setStep2Valid(formData.gender !== "" && canRegister);
  }, [formData.gender, canRegister]);

  useEffect(() => {
    setStep3Valid(formData.profile_photo !== null);
  }, [formData.profile_photo]);

  useEffect(() => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    const email = formData.email.trim();

    if (email === "") {
      setEmailError(""); setEmailSuccessMessage(""); setEmailAvailable(false);
      setCanRegister(false); setIsCheckingEmail(false); setCheckingEligibility(false);
      return;
    }

    if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
      setEmailError(t("register.errorInvalidEmail")); setEmailSuccessMessage("");
      setEmailAvailable(false); setCanRegister(false); setIsCheckingEmail(false);
      setCheckingEligibility(false); setShakeEmail(true);
      setTimeout(() => setShakeEmail(false), 400);
      return;
    }

    setCheckingEligibility(true); setIsCheckingEmail(true);
    setEmailError(""); setEmailSuccessMessage("");

    emailTimeoutRef.current = setTimeout(async () => {
      try {
        const checkResponse = await API.get(`/users/check-can-register/?email=${encodeURIComponent(email)}`);
        const { exists, email_available, message } = checkResponse.data || {};

        if (exists) {
          setEmailError(t("register.errorEmailExists")); setEmailSuccessMessage("");
          setEmailAvailable(false); setCanRegister(false);
          setShakeEmail(true); setTimeout(() => setShakeEmail(false), 400);
          return;
        }

        setEmailAvailable(Boolean(email_available)); setCanRegister(false);
        setEmailError(""); setEmailSuccessMessage(message || t("register.emailVerified"));
        setEligibilityMessage(message || "");
      } catch (err) {
        if (err.response?.status === 400) setEmailError(t("register.errorEmailRequired"));
        else setEmailError(t("register.errorCheckUnavailable"));
        setEmailSuccessMessage(""); setEmailAvailable(false); setCanRegister(false);
      } finally {
        setCheckingEligibility(false); setIsCheckingEmail(false);
      }
    }, 300);
  }, [formData.email]);

  useEffect(() => {
    const email = formData.email.trim();
    const gender = formData.gender;

    if (!emailAvailable || !gender) { setCanRegister(false); return; }

    let cancelled = false;
    setCheckingEligibility(true);

    const checkGenderAvailability = async () => {
      try {
        const response = await API.get(
          `/users/check-can-register/?email=${encodeURIComponent(email)}&gender=${encodeURIComponent(gender)}`
        );
        if (cancelled) return;
        const allowed = Boolean(response.data?.can_register);
        setCanRegister(allowed);
        if (!allowed) {
          setEligibilityMessage(response.data?.message || t("register.menPauseMessage"));
          setShowEligibilityModal(true);
        } else {
          setEligibilityMessage("");
        }
      } catch (err) {
        if (cancelled) return;
        setCanRegister(false);
        setEligibilityMessage(err.response?.data?.error || t("register.errorCheckUnavailable"));
        setShowEligibilityModal(true);
      } finally {
        if (!cancelled) setCheckingEligibility(false);
      }
    };

    checkGenderAvailability();
    return () => { cancelled = true; };
  }, [emailAvailable, formData.gender]);

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) setFormData({ ...formData, [name]: files[0] });
    else setFormData({ ...formData, [name]: value });
  };

  const nextStep = () => {
    setErrorMessage("");
    if (step === 1 && !step1Valid) { setErrorMessage(t("register.errorFillFields")); return; }
    if (step === 2 && !step2Valid) {
      setErrorMessage(formData.gender ? (eligibilityMessage || t("register.menPauseMessage")) : t("register.errorSelectGender"));
      return;
    }
    if (step === 3 && !step3Valid) { setErrorMessage(t("register.errorPhotoRequired")); return; }
    setStep(step + 1);
  };

  const prevStep = () => { setStep(step - 1); setErrorMessage(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 3) return;
    setErrorMessage("");
    if (!formData.profile_photo) { setErrorMessage(t("register.errorPhotoRequired")); return; }

    const data = new FormData();
    data.append("first_name", formData.first_name);
    data.append("last_name", formData.last_name);
    data.append("email", formData.email);
    data.append("birth_date", formData.birth_date);
    data.append("gender", formData.gender);
    data.append("password", formData.password);
    data.append("password2", formData.password2);
    data.append("country", formData.country);
    data.append("city", formData.city);
    if (formData.latitude) data.append("latitude", formData.latitude);
    if (formData.longitude) data.append("longitude", formData.longitude);
    if (formData.profile_photo) data.append("profile_photo", formData.profile_photo);

    setLoading(true);
    try {
      const response = await API.post("users/register/", data, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0,
      });
      navigate("/verify-otp", {
        state: { userId: response.data.user_id, email: formData.email, expiresIn: response.data?.expires_in }
      });
    } catch (error) {
      let message = t("register.errorGeneric");
      if (error.response) {
        if (error.response.status === 403) {
          message = error.response.data?.error || t("register.menPauseMessage");
          setEligibilityMessage(message); setShowEligibilityModal(true);
        } else if (error.response.data.error) {
          message = error.response.data.error;
          setEmailError(message); setShakeEmail(true);
          setTimeout(() => setShakeEmail(false), 400);
        } else if (typeof error.response.data === "object") {
          const errors = Object.values(error.response.data).flat();
          if (errors.length > 0 && (errors[0].toLowerCase().includes("waitlist") || errors[0].toLowerCase().includes("inscriptions hommes"))) {
            message = t("register.menPauseMessage"); setShowEligibilityModal(true);
          } else { message = errors.join("\n"); }
        } else { message = error.response.data; }
      } else if (error.request) { message = t("register.errorNetwork"); }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = [
    t("register.stepInfo"),
    t("register.stepGender"),
    t("register.stepPhoto"),
  ];

  const quoteByStep = {
    1: "« Commence par te présenter, laisse ta personnalité briller. »",
    2: "« Sois toi-même. Les vraies connexions naissent de l'authenticité. »",
    3: "« Montre ton vrai visage. C'est là que la magie commence. »",
  };

  return (
    <>
      <div className="auth-page">
        {/* ── Photo Panel ── */}
        <div className="auth-photo-panel">
          <img
            className="auth-photo-bg"
            src="https://images.pexels.com/photos/6870277/pexels-photo-6870277.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt=""
          />
          <div className="auth-photo-overlay" />
          <div className="auth-photo-top">
            <BrandLogo height={34} style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <div className="auth-photo-bottom">
            <blockquote>{quoteByStep[step]}</blockquote>
            <cite>— L'esprit NouMatch</cite>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="auth-form-panel">
          <div className="auth-form-inner" style={{ maxWidth: "500px" }}>
            <Link to="/" className="auth-form-logo">
              <BrandLogo height={40} />
            </Link>

            <h1 className="auth-form-title">{t("register.createAccount")}</h1>
            <p className="auth-form-subtitle">Rejoignez la communauté NouMatch.</p>

            {/* Step Progress */}
            <div className="auth-steps">
              {STEP_LABELS.map((label, i) => (
                <React.Fragment key={i}>
                  <div className="auth-step">
                    <div className={`auth-step-circle ${step > i + 1 ? "done" : step === i + 1 ? "active" : "pending"}`}>
                      {step > i + 1 ? "✓" : i + 1}
                    </div>
                    <span className={`auth-step-label ${step > i + 1 ? "done" : step === i + 1 ? "active" : ""}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`auth-step-connector ${step > i + 1 ? "done" : ""}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {errorMessage && (
              <div className="auth-alert error" style={{ whiteSpace: "pre-wrap" }}>{errorMessage}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ── Step 1: Info ── */}
              {step === 1 && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="auth-label">{t("register.firstName")}</label>
                    <input type="text" name="first_name" className="auth-input" placeholder={t("register.firstNamePlaceholder")} required value={formData.first_name} onChange={handleChange} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="auth-label">{t("register.lastName")}</label>
                    <input type="text" name="last_name" className="auth-input" placeholder={t("register.lastNamePlaceholder")} required value={formData.last_name} onChange={handleChange} />
                  </div>
                  <div className="col-12">
                    <label className="auth-label">{t("register.email")}</label>
                    <input
                      type="email"
                      name="email"
                      className={`auth-input ${shakeEmail ? "shake" : ""} ${emailError ? "has-error" : emailAvailable ? "has-success" : ""}`}
                      placeholder={t("register.emailPlaceholder")}
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                    {emailError && <span className="auth-field-hint error">{emailError}</span>}
                    {!emailError && emailAvailable && !checkingEligibility && (
                      <span className="auth-field-hint success">{emailSuccessMessage || t("register.emailVerified")}</span>
                    )}
                    {(checkingEligibility || isCheckingEmail) && (
                      <span className="auth-field-hint muted">{t("register.checkingEligibility")}</span>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="auth-label">{t("register.country")}</label>
                    <div className="auth-country-field">
                      {countryCode && (
                        <img src={`https://flagcdn.com/w40/${countryCode}.png`} width="28" height="21" alt={formData.country} style={{ objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
                      )}
                      <span className="auth-country-name">{formData.country}</span>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="auth-label">{t("register.birthDate")}</label>
                    <input type="date" name="birth_date" className="auth-input" required value={formData.birth_date} onChange={handleChange} />
                    <span className="auth-field-hint muted">{t("register.mustBeAdult")}</span>
                  </div>
                  <input type="hidden" name="city" value={formData.city} />
                  <input type="hidden" name="latitude" value={formData.latitude} />
                  <input type="hidden" name="longitude" value={formData.longitude} />
                  <div className="col-12 col-md-6">
                    <label className="auth-label">{t("register.password")}</label>
                    <input type="password" name="password" className="auth-input" placeholder={t("register.passwordPlaceholder")} required value={formData.password} onChange={handleChange} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="auth-label">{t("register.confirm")}</label>
                    <input type="password" name="password2" className="auth-input" placeholder={t("register.confirmPlaceholder")} required value={formData.password2} onChange={handleChange} />
                  </div>
                </div>
              )}

              {/* ── Step 2: Gender ── */}
              {step === 2 && (
                <div>
                  <label className="auth-label">{t("register.gender")}</label>
                  <select name="gender" className="auth-input" required onChange={handleChange} value={formData.gender}>
                    <option value="" disabled>{t("register.selectGender")}</option>
                    <option value="male">{t("register.male")}</option>
                    <option value="female">{t("register.female")}</option>
                  </select>
                  <input type="hidden" name="country" value={formData.country} />
                  <input type="hidden" name="city" value={formData.city} />
                  <input type="hidden" name="latitude" value={formData.latitude} />
                  <input type="hidden" name="longitude" value={formData.longitude} />
                </div>
              )}

              {/* ── Step 3: Photo ── */}
              {step === 3 && (
                <div>
                  <label className="auth-label">
                    {t("register.profilePhoto")} <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="file"
                    name="profile_photo"
                    className={`auth-input ${formData.profile_photo ? "has-success" : ""}`}
                    accept="image/*"
                    onChange={handleChange}
                    required
                  />
                  <span className="auth-field-hint muted">{t("register.photoHint")}</span>
                  {formData.profile_photo ? (
                    <span className="auth-field-hint success">
                      ✓ {t("register.photoSelected")}: {formData.profile_photo.name}
                    </span>
                  ) : (
                    <span className="auth-field-hint error">{t("register.errorPhotoRequired")}</span>
                  )}
                  {formData.profile_photo && (
                    <div className="mt-3 text-center">
                      <img
                        src={URL.createObjectURL(formData.profile_photo)}
                        alt={t("register.preview")}
                        style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", border: "3px solid #dc2626" }}
                      />
                    </div>
                  )}
                  <input type="hidden" name="country" value={formData.country} />
                  <input type="hidden" name="city" value={formData.city} />
                  <input type="hidden" name="latitude" value={formData.latitude} />
                  <input type="hidden" name="longitude" value={formData.longitude} />
                </div>
              )}

              {/* ── Navigation buttons ── */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem" }}>
                {step > 1 && (
                  <button type="button" onClick={prevStep} className="nm-btn-ghost" style={{ flex: 1 }} disabled={loading}>
                    {t("register.back")}
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="nm-btn-primary"
                    style={{ flex: 1 }}
                    disabled={loading || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                  >
                    {t("register.continue")}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="nm-btn-primary"
                    style={{ flex: 1 }}
                    disabled={loading || !step3Valid}
                  >
                    {loading ? t("register.submitting") : t("register.submit")}
                  </button>
                )}
              </div>
            </form>

            <div className="text-center mt-3" style={{ color: "#64748b", fontSize: "0.88rem" }}>
              {t("register.haveAccount")}{" "}
              <Link to="/login" className="auth-link">{t("register.login")}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Eligibility Modal ── */}
      {showEligibilityModal && (
        <div className="nm-modal-overlay">
          <div className="nm-modal-card">
            <div className="nm-modal-icon">⏳</div>
            <h5>{t("register.balanceModalTitle")}</h5>
            <p>{eligibilityMessage || t("register.menPauseMessage")}</p>
            <div className="nm-modal-info">
              ♥ {t("register.balancePrompt")}
            </div>
            <button
              type="button"
              className="nm-btn-primary"
              onClick={() => setShowEligibilityModal(false)}
            >
              {t("register.tryLater")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
