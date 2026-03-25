import { FaHeart } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import API from '@/api/axios';

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [countryCode, setCountryCode] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    birth_date: "",
    password: "",
    password2: "",
    gender: "",
    profile_photo: null,
    country: "",
    city: "",
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-detect user's location on component mount
  useEffect(() => {
    detectUserLocation();
  }, []);

  const detectUserLocation = async () => {
    try {
      setDetectingLocation(true);
      
      // Try multiple free APIs as fallback
      let data = null;
      
      // Try ipapi.co first
      try {
        const response = await fetch('https://ipapi.co/json/', { timeout: 5000 });
        if (response.ok) {
          data = await response.json();
        }
      } catch (e) {
        console.log("ipapi.co failed, trying fallback...");
      }
      
      // Fallback to ip-api.com (no API key required)
      if (!data || !data.country_name) {
        const response = await fetch('http://ip-api.com/json/');
        if (response.ok) {
          const fallbackData = await response.json();
          if (fallbackData.status === 'success') {
            data = {
              country_name: fallbackData.country,
              city: fallbackData.city,
              latitude: fallbackData.lat,
              longitude: fallbackData.lon,
              country_code: fallbackData.countryCode.toLowerCase()
            };
          }
        }
      }
      
      if (data && data.country_name) {
        setFormData(prev => ({ 
          ...prev, 
          country: data.country_name,
          city: data.city || "",
          latitude: data.latitude ? String(data.latitude) : "",
          longitude: data.longitude ? String(data.longitude) : ""
        }));
        setCountryCode(data.country_code?.toLowerCase() || "");
        console.log("📍 Localisation détectée:", data.city, data.country_name);
      } else {
        console.log("No location data found");
        setFormData(prev => ({ 
          ...prev, 
          country: "", 
          city: "", 
          latitude: "", 
          longitude: "" 
        }));
        setCountryCode("");
      }
    } catch (error) {
      console.error("Erreur lors de la détection:", error);
      setFormData(prev => ({ 
        ...prev, 
        country: "", 
        city: "", 
        latitude: "", 
        longitude: "" 
      }));
      setCountryCode("");
    } finally {
      setDetectingLocation(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < 3) {
        nextStep();
      }
    }
  };

  const nextStep = () => {
    setErrorMessage("");

    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.birth_date || !formData.password || !formData.password2) {
        setErrorMessage("Veuillez remplir tous les champs");
        return;
      }
      
      const age = calculateAge(formData.birth_date);
      if (age < 18) {
        setErrorMessage("Vous devez avoir au moins 18 ans pour vous inscrire.");
        return;
      }

      if (formData.password !== formData.password2) {
        setErrorMessage("Les mots de passe ne correspondent pas.");
        return;
      }
    }

    if (step === 2) {
      if (!formData.gender) {
        setErrorMessage("Veuillez sélectionner votre genre");
        return;
      }
    }

    if (step === 3) {
      if (!formData.profile_photo) {
        setErrorMessage("La photo de profil est requise");
        return;
      }
    }

    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step !== 3) {
      return;
    }
    
    setErrorMessage("");

    if (!formData.profile_photo) {
      setErrorMessage("La photo de profil est requise");
      return;
    }

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
    
    if (formData.latitude) {
      data.append("latitude", formData.latitude);
    }
    if (formData.longitude) {
      data.append("longitude", formData.longitude);
    }

    if (formData.profile_photo) {
      data.append("profile_photo", formData.profile_photo);
    }

    console.log("Envoi des données:");
    console.log("Country:", formData.country);
    console.log("City:", formData.city);
    console.log("Latitude:", formData.latitude);
    console.log("Longitude:", formData.longitude);

    setLoading(true);

    try {
      const response = await API.post("users/register/", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      navigate("/verify-otp", { 
        state: { 
          userId: response.data.user_id,
          email: formData.email
        } 
      });
      
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      
      if (error.response) {
        let message = "";
        if (typeof error.response.data === "object") {
          for (let key in error.response.data) {
            message += `${key}: ${error.response.data[key]}\n`;
          }
        } else {
          message = error.response.data || "Échec de l'inscription";
        }
        setErrorMessage(message);
      } else if (error.request) {
        setErrorMessage("Erreur réseau. Veuillez réessayer.");
      } else {
        setErrorMessage("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = `${(step / 3) * 100}%`;

  return (
    <div
      className="vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        backgroundImage:
          "url('https://img.freepik.com/free-photo/romantic-black-couple-sitting-restaurant-wearing-elegant-clothes_1157-51961.jpg')",
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
        style={{
          width: "100%",
          maxWidth: "500px",
          maxHeight: "600px",
          overflow: "hidden",
          borderRadius: "24px !important",
        }}
      >
        <div 
          className="card-body"
          style={{
            height: "100%",
            overflowY: "auto",
            padding: "1.5rem",
            borderRadius: "24px",
          }}
        >
          <div className="text-center mb-4">
            <h1 className="d-flex justify-content-center align-items-center fw-bold">
              <FaHeart className="text-danger me-2" />
              <span className="text-primary">NouMatch</span>
            </h1>
            <p className="text-muted mb-0">Créez votre compte</p>
          </div>

          <div className="progress mb-4" style={{ height: "8px", borderRadius: "20px" }}>
            <div
              className="progress-bar bg-danger"
              role="progressbar"
              style={{ 
                width: progressWidth, 
                borderRadius: "20px",
                transition: "width 0.3s ease"
              }}
            ></div>
          </div>

          <div className="d-flex justify-content-between mb-4">
            <div className={`text-center ${step >= 1 ? 'text-danger' : 'text-muted'}`}>
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${step >= 1 ? 'bg-danger text-white' : 'bg-light'}`} 
                style={{ width: "30px", height: "30px", borderRadius: "50% !important" }}
              >
                1
              </div>
              <small>Informations</small>
            </div>
            <div className={`text-center ${step >= 2 ? 'text-danger' : 'text-muted'}`}>
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${step >= 2 ? 'bg-danger text-white' : 'bg-light'}`} 
                style={{ width: "30px", height: "30px", borderRadius: "50% !important" }}
              >
                2
              </div>
              <small>Genre</small>
            </div>
            <div className={`text-center ${step >= 3 ? 'text-danger' : 'text-muted'}`}>
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${step >= 3 ? 'bg-danger text-white' : 'bg-light'}`} 
                style={{ width: "30px", height: "30px", borderRadius: "50% !important" }}
              >
                3
              </div>
              <small>Photo</small>
            </div>
          </div>

          {errorMessage && (
            <div className="alert alert-danger white-space-pre-wrap" style={{ borderRadius: "16px" }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="row">
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Prénom</label>
                  <input
                    type="text"
                    name="first_name"
                    className="form-control form-control-lg"
                    placeholder="Entrez votre prénom"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Nom</label>
                  <input
                    type="text"
                    name="last_name"
                    className="form-control form-control-lg"
                    placeholder="Entrez votre nom"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control form-control-lg"
                    placeholder="Entrez votre adresse email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                {/* COUNTRY FIELD - READ ONLY WITH FLAG */}
                <div className="col-12 mb-3">
                  <label className="form-label">Pays</label>
                  <div className="d-flex align-items-center">
                    {countryCode && !detectingLocation && countryCode !== "" && (
                      <img 
                        src={`https://flagcdn.com/w40/${countryCode}.png`}
                        srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
                        width="30"
                        height="22.5"
                        alt={formData.country}
                        style={{ 
                          marginRight: "10px",
                          borderRadius: "4px",
                          objectFit: "cover"
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      value={formData.country}
                      readOnly
                      disabled={detectingLocation}
                      placeholder={detectingLocation ? "Détection en cours..." : "Pays détecté"}
                      style={{ 
                        borderRadius: "16px",
                        backgroundColor: detectingLocation ? "#e9ecef" : "#f8f9fa",
                        cursor: detectingLocation ? "wait" : "not-allowed"
                      }}
                    />
                  </div>
                  {detectingLocation && (
                    <div className="mt-1">
                      <div className="spinner-border spinner-border-sm text-secondary me-2" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                      <small className="text-muted">Détection de votre localisation...</small>
                    </div>
                  )}
                  {!detectingLocation && formData.country && (
                    <small className="text-muted">Pays automatiquement détecté</small>
                  )}
                </div>

                {/* CITY FIELD - EDITABLE */}
                <div className="col-12 mb-3">
                  <label className="form-label">Ville</label>
                  <input
                    type="text"
                    name="city"
                    className="form-control form-control-lg"
                    placeholder={detectingLocation ? "Détection de votre ville..." : "Entrez votre ville"}
                    value={formData.city}
                    onChange={handleChange}
                    disabled={detectingLocation}
                    style={{ 
                      borderRadius: "16px",
                      backgroundColor: detectingLocation ? "#e9ecef" : "#fff"
                    }}
                  />
                  {!detectingLocation && (
                    <small className="text-muted">Vous pouvez modifier votre ville si nécessaire</small>
                  )}
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Date de naissance</label>
                  <input
                    type="date"
                    name="birth_date"
                    className="form-control form-control-lg"
                    required
                    value={formData.birth_date}
                    onChange={handleChange}
                    style={{ borderRadius: "16px" }}
                  />
                  <small className="text-muted">Vous devez avoir au moins 18 ans</small>
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control form-control-lg"
                    placeholder="Créez un mot de passe"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    style={{ borderRadius: "16px" }}
                  />
                </div>

                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Confirmer</label>
                  <input
                    type="password"
                    name="password2"
                    className="form-control form-control-lg"
                    placeholder="Confirmez"
                    required
                    value={formData.password2}
                    onChange={handleChange}
                    style={{ borderRadius: "16px" }}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="row">
                <div className="col-12 mb-3">
                  <label className="form-label">Genre</label>
                  <select
                    name="gender"
                    className="form-control form-control-lg"
                    required
                    onChange={handleChange}
                    value={formData.gender}
                    style={{ borderRadius: "16px" }}
                  >
                    <option value="" disabled>Sélectionnez votre genre</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                  </select>
                </div>

                <input type="hidden" name="country" value={formData.country} />
                <input type="hidden" name="city" value={formData.city} />
                <input type="hidden" name="latitude" value={formData.latitude} />
                <input type="hidden" name="longitude" value={formData.longitude} />
              </div>
            )}

            {step === 3 && (
              <div className="row">
                <div className="col-12 mb-3">
                  <label className="form-label">
                    Photo de profil <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    name="profile_photo"
                    className="form-control form-control-lg"
                    accept="image/*"
                    onChange={handleChange}
                    required
                    style={{ 
                      borderRadius: "16px",
                      borderColor: formData.profile_photo ? "#28a745" : "#e9ecef"
                    }}
                  />
                  <small className="text-muted">
                    Téléchargez une photo claire de vous-même (requis)
                  </small>
                  
                  {formData.profile_photo ? (
                    <div className="mt-2 text-success">
                      <i className="fas fa-check-circle me-1"></i>
                      Photo sélectionnée: {formData.profile_photo.name}
                    </div>
                  ) : (
                    <div className="mt-2 text-danger">
                      <i className="fas fa-exclamation-circle me-1"></i>
                      La photo de profil est requise
                    </div>
                  )}

                  {formData.profile_photo && (
                    <div className="mt-3 text-center">
                      <img
                        src={URL.createObjectURL(formData.profile_photo)}
                        alt="Aperçu"
                        className="rounded-circle"
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                          border: "3px solid #ff4d6d"
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <input type="hidden" name="country" value={formData.country} />
                <input type="hidden" name="city" value={formData.city} />
                <input type="hidden" name="latitude" value={formData.latitude} />
                <input type="hidden" name="longitude" value={formData.longitude} />
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn btn-outline-secondary w-50"
                  disabled={loading}
                  style={{ borderRadius: "16px" }}
                >
                  Retour
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className={`btn btn-danger ${step > 1 ? 'w-50' : 'w-100'}`}
                  disabled={loading}
                  style={{ borderRadius: "16px" }}
                >
                  Continuer
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-danger w-100 btn-lg"
                  disabled={loading || !formData.profile_photo}
                  style={{ borderRadius: "16px" }}
                >
                  {loading ? "Création du compte..." : "Créer mon compte"}
                </button>
              )}
            </div>
          </form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Vous avez déjà un compte?{" "}
              <Link to="/login" className="text-danger text-decoration-none fw-semibold">
                Se connecter
              </Link>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}