import React, { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaUser,
  FaMars,
  FaSpinner,
  FaCheckCircle,
  FaHeart,
  FaClock,
  FaRocket,
  FaArrowLeft,
  FaChevronDown,
  FaChevronUp,
  FaShieldAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import AOS from "aos";
import "aos/dist/aos.css";

export default function WaitlistMen() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    gender: "male",
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState(1);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
    fetchStats();
    return () => AOS.refresh();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await API.get("/waitlist/stats/");
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (stats && !stats.can_join_as_man) {
      setError("Accès temporairement limité pour garantir une communauté équilibrée. Merci de revenir plus tard.");
      setLoading(false);
      return;
    }

    try {
      const response = await API.post("/waitlist/join/", formData);
      if (response.data.success) {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (id) => setOpenFaq(openFaq === id ? null : id);
  const isBlocked = stats && !stats.can_join_as_man;

  if (success) {
    return (
      <div className="container py-5" style={{ paddingTop: "100px" }}>
        <div className="card border-0 shadow-lg rounded-4 text-center p-5" data-aos="zoom-in">
          <div className="mb-4">
            <div className="bg-success rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: "80px", height: "80px" }}>
              <FaCheckCircle size={50} className="text-white" />
            </div>
          </div>
          <h2 className="fw-bold mb-3">Merci {formData.first_name} !</h2>
          <p className="lead text-muted mb-4">Votre inscription est bien enregistrée. Vous serez contacté par email dès que NouMatch sera disponible.</p>
          <Link to="/" className="btn btn-primary px-4 mx-auto" style={{ width: "fit-content" }}>Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "60px" }}>
      {/* Hero Section */}
    <section
    className="position-relative d-flex align-items-center"
    style={{
        minHeight: "80vh",
        backgroundImage: "url('https://img.freepik.com/premium-photo/fitness-running-smile-with-portrait-black-man-bridge-training-health-workout-sports-endurance-stamina-with-face-runner-city-exercise-cardio-challenge-goals_590464-118048.jpg?semt=ais_incoming&w=740&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
    }}>
    {/* Dark Overlay for Readability */}
    <div
        className="position-absolute w-100 h-100"
        style={{
        background: "linear-gradient(135deg, rgba(0, 123, 255, 0.85) 0%, rgba(0, 86, 179, 0.85) 100%)",
        top: 0,
        left: 0,
        }}
    ></div>
    
    <div className="container position-relative text-center text-white py-5" style={{ zIndex: 2 }}>
        <h1 className="display-4 fw-bold mb-3">Espace Hommes</h1>
        <p className="lead mb-0">Accédez en avant-première à NouMatch</p>
    </div>
    </section>

      {/* Form Section */}
      <section id="form" className="py-5 bg-light">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-7">
              {isBlocked ? (
                <div className="card border-0 shadow-lg rounded-4 text-center p-5" data-aos="fade-up">
                  <div className="mb-4">
                    <div
                      className="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto"
                      style={{ width: "80px", height: "80px" }}
                    >
                      <FaInfoCircle size={50} className="text-warning" />
                    </div>
                  </div>
                  <h3 className="fw-bold mb-3">Accès temporairement limité</h3>
                  <p className="text-muted mb-4">
                    Nous avons atteint la limite d'inscriptions pour le moment afin de garantir une communauté équilibrée et des rencontres de qualité. Merci de revenir plus tard.
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <button
                      onClick={() => navigate("/waitlist")}
                      className="btn btn-primary px-4"
                    >
                      Retour à l'accueil
                    </button>
                    <button
                      onClick={() => navigate("/waitlist/women")}
                      className="btn btn-outline-danger px-4"
                    >
                      Inviter une amie
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card border-0 shadow-lg rounded-4 overflow-hidden" data-aos="fade-up">
                  <div className="card-header bg-primary text-white text-center py-4">
                    <h3 className="fw-bold mb-0">🕺 Rejoignez notre communauté</h3>
                    <p className="mb-0 mt-2">Inscrivez-vous pour recevoir les informations prioritaires</p>
                  </div>
                  <div className="card-body p-5">
                    {error && (
                      <div className="alert alert-danger rounded-3 mb-4" data-aos="fade-down">
                        <FaSpinner className="me-2" />
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div className="row g-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Prénom</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-0">
                              <FaUser className="text-primary" />
                            </span>
                            <input
                              type="text"
                              name="first_name"
                              className="form-control form-control-lg border-0 bg-light"
                              placeholder="Votre prénom"
                              value={formData.first_name}
                              onChange={handleChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Nom</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-0">
                              <FaUser className="text-primary" />
                            </span>
                            <input
                              type="text"
                              name="last_name"
                              className="form-control form-control-lg border-0 bg-light"
                              placeholder="Votre nom"
                              value={formData.last_name}
                              onChange={handleChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">Email</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-0">
                              <FaEnvelope className="text-primary" />
                            </span>
                            <input
                              type="email"
                              name="email"
                              className="form-control form-control-lg border-0 bg-light"
                              placeholder="nom@exemple.com"
                              value={formData.email}
                              onChange={handleChange}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="alert alert-info mt-4 rounded-3">
                        <FaClock className="me-2" />
                        <small>
                          Votre adresse email ne sera pas partagée. Nous vous contacterons uniquement pour les informations liées au lancement.
                        </small>
                      </div>

                      <div className="d-flex gap-3 mt-4">
                        <button
                          type="button"
                          onClick={() => navigate("/waitlist")}
                          className="btn btn-outline-secondary flex-grow-1 py-2 rounded-pill"
                        >
                          <FaArrowLeft className="me-2" />
                          Retour
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary flex-grow-1 py-2 rounded-pill"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <FaSpinner className="spin me-2" />
                              Inscription...
                            </>
                          ) : (
                            "Rejoindre la liste d'attente"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-5 bg-white">
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold display-6 text-primary mb-3">Pourquoi rejoindre NouMatch ?</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Découvrez les avantages exclusifs réservés à nos premiers inscrits
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="100">
              <div className="text-center p-4">
                <div
                  className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaRocket className="text-primary fs-2" />
                </div>
                <h5 className="fw-bold">Accès prioritaire</h5>
                <p className="text-muted">Soyez parmi les premiers à découvrir l'application dès son lancement</p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
              <div className="text-center p-4">
                <div
                  className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaHeart className="text-primary fs-2" />
                </div>
                <h5 className="fw-bold">Rencontres authentiques</h5>
                <p className="text-muted">Des connexions sincères et des relations durables</p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
              <div className="text-center p-4">
                <div
                  className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaShieldAlt className="text-primary fs-2" />
                </div>
                <h5 className="fw-bold">Communauté respectueuse</h5>
                <p className="text-muted">Un espace où chaque membre est valorisé</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-5 bg-light">
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold display-6 text-primary mb-3">Questions fréquentes</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Tout ce que vous devez savoir sur NouMatch
            </p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
                <button
                  onClick={() => toggleFaq(1)}
                  className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                  style={{ borderRadius: "0", border: "none" }}
                >
                  <span className="fw-semibold fs-5">Quand NouMatch sera-t-il disponible ?</span>
                  {openFaq === 1 ? (
                    <FaChevronUp className="text-primary" />
                  ) : (
                    <FaChevronDown className="text-primary" />
                  )}
                </button>
                <div
                  style={{
                    maxHeight: openFaq === 1 ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease-in-out"
                  }}
                >
                  <div className="p-4 pt-0 text-muted">
                    Nous travaillons actuellement sur le développement de l'application. Les membres inscrits sur la liste d'attente seront informés par email dès que nous serons prêts à ouvrir.
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
                <button
                  onClick={() => toggleFaq(2)}
                  className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                  style={{ borderRadius: "0", border: "none" }}
                >
                  <span className="fw-semibold fs-5">Pourquoi rejoindre la liste d'attente ?</span>
                  {openFaq === 2 ? (
                    <FaChevronUp className="text-primary" />
                  ) : (
                    <FaChevronDown className="text-primary" />
                  )}
                </button>
                <div
                  style={{
                    maxHeight: openFaq === 2 ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease-in-out"
                  }}
                >
                  <div className="p-4 pt-0 text-muted">
                    Cela nous permet de mieux comprendre qui souhaite rejoindre NouMatch et de vous tenir informé directement. Vous serez parmi les premiers à découvrir l'application.
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
                <button
                  onClick={() => toggleFaq(3)}
                  className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                  style={{ borderRadius: "0", border: "none" }}
                >
                  <span className="fw-semibold fs-5">Est-ce que l'inscription est payante ?</span>
                  {openFaq === 3 ? (
                    <FaChevronUp className="text-primary" />
                  ) : (
                    <FaChevronDown className="text-primary" />
                  )}
                </button>
                <div
                  style={{
                    maxHeight: openFaq === 3 ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease-in-out"
                  }}
                >
                  <div className="p-4 pt-0 text-muted">
                    L'inscription sur la liste d'attente est entièrement gratuite. Aucun paiement n'est demandé à cette étape.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .bg-opacity-10 {
          --bs-bg-opacity: 0.1;
        }
      `}</style>
    </div>
  );
}