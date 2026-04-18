import React, { useState, useEffect } from "react";
import {
  FaVenusMars,
  FaHeart,
  FaUsers,
  FaRocket,
  FaGift,
  FaShieldAlt,
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AOS from "aos";
import "aos/dist/aos.css";
import heroBg from "../assets/waitlist-hero.png";
import sneekPeak from "../assets/apptease.png";

export default function Waitlist() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [openFaq, setOpenFaq] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
    fetchStats();

    return () => {
      AOS.refresh();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await API.get("/waitlist/stats/");
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleGenderSelect = (gender) => {
    if (gender === "female") {
      navigate("/waitlist/women");
    } else if (gender === "male") {
      if (stats && !stats.can_join_as_man) {
        setError("Accès temporairement limité pour garantir une communauté équilibrée. Merci de revenir plus tard.");
        setTimeout(() => setError(""), 5000);
        return;
      }
      navigate("/waitlist/men");
    }
  };

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const isMenBlocked = stats && !stats.can_join_as_man;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        paddingTop: "60px",
      }}
    >
      {/* Hero Section */}
      <section
        className="position-relative d-flex align-items-center"
        style={{
          minHeight: "100vh",
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "top",
          backgroundRepeat: "no-repeat",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="position-absolute w-100 h-100"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.65) 100%)",
            top: 0,
            left: 0,
          }}
        ></div>

        <div className="container position-relative px-3" style={{ zIndex: 2 }}>
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center text-white" data-aos="fade-down">
              <div
                className="d-inline-block bg-danger text-white px-4 py-2 rounded-pill mb-4"
                style={{ fontSize: "0.9rem" }}
              >
                <FaRocket className="me-2" />
                Ouverture prochaine
              </div>

              <h1 className="display-5 fw-bold mb-4">
                Rencontrez <span className="text-danger">des profils près de vous</span> en Haïti
              </h1>

              <p className="text-light mb-0">
                <FaHeart className="text-danger me-1" />
                Swipe. Match. Discute. Rejoignez la liste d’attente pour découvrir NouMatch en avant-première.
              </p>

              <p className="text-white-50 mt-3 mb-0">
                Déjà de nombreuses personnes attendent l’ouverture de NouMatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container my-4">
        <div className="row justify-content-center g-3">
          <div className="col-12 col-md-10 col-lg-9">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div
                  className="h-100 d-flex align-items-center gap-3 px-4 py-3 rounded-4 shadow-sm border"
                  style={{
                    background: "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
                    borderColor: "#ffccd5",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "52px",
                      height: "52px",
                      backgroundColor: "#ff4d6d",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold mb-1"
                      style={{ color: "#b02a37", fontSize: "1rem" }}
                    >
                      Inscription rapide
                    </div>
                    <div className="text-muted small">
                      Environ 30 secondes pour rejoindre la liste d’attente
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div
                  className="h-100 d-flex align-items-center gap-3 px-4 py-3 rounded-4 shadow-sm border"
                  style={{
                    background: "linear-gradient(135deg, #fff0f3 0%, #ffffff 100%)",
                    borderColor: "#ffb3c1",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "52px",
                      height: "52px",
                      backgroundColor: "#ff4d6d",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="fas fa-gift"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold mb-1"
                      style={{ color: "#b02a37", fontSize: "1rem" }}
                    >
                      100% gratuit au lancement
                    </div>
                    <div className="text-muted small">
                      Soyez parmi les premiers à découvrir NouMatch, sans frais au lancement
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div
                  className="h-100 d-flex align-items-center gap-3 px-4 py-3 rounded-4 shadow-sm border"
                  style={{
                    background: "linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)",
                    borderColor: "#ffccd5",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "52px",
                      height: "52px",
                      backgroundColor: "#ff4d6d",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div>
                    <div
                      className="fw-bold mb-1"
                      style={{ color: "#b02a37", fontSize: "1rem" }}
                    >
                      Données sécurisées
                    </div>
                    <div className="text-muted small">
                      Vos informations restent confidentielles et protégées
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mt-3" style={{ position: "relative", zIndex: 2 }}>
          <div className="alert alert-danger text-center">
            <FaInfoCircle className="me-2" />
            {error}
          </div>
        </div>
      )}

      <div className="container bg-light p-5 my-5 rounded-4">
        <div className="row align-items-center g-4">

          {/* LEFT TEXT */}
          <div className="col-12 col-lg-5">
            <div>
              <h2 className="fw-bold mb-3 text-danger">
                Accès prioritaire aux premiers inscrits 🚀
              </h2>

              <p className="text-muted mb-3">
                Les premiers inscrits sur NouMatch auront l’opportunité de découvrir l’application en avant-première et de commencer à explorer les profils dès l’ouverture.
              </p>

              <p className="text-danger fw-semibold small mb-4">
                🔥 Les premiers inscrits auront plus de visibilité dès le lancement
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-star text-danger"></i>
                  <span className="fw-semibold">
                    Découverte en avant-première de NouMatch
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-heart text-danger"></i>
                  <span className="fw-semibold">
                    Plus d’opportunités de connexion dès l’ouverture
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-bolt text-danger"></i>
                  <span className="fw-semibold">
                    Un profil visible plus tôt dans l’expérience
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="col-12 col-lg-7 d-flex justify-content-center align-items-center">
            <div className="w-100 d-flex justify-content-center">
              <img
                src={sneekPeak}
                alt="NouMatch App Preview"
                className="img-fluid rounded-4 shadow"
                style={{
                  maxHeight: "650px",
                  width: "auto",
                  objectFit: "contain",
                  transition: "transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Gender Selection Section */}
      <section className="py-5" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="display-5 fw-bold mb-3">Choisissez votre parcours</h2>
            <p className="lead text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Sélectionnez votre espace pour rejoindre la liste d’attente NouMatch.
            </p>
          </div>

          <div className="row justify-content-center g-4">
            {/* Women Card - Always Available */}
            <div className="col-lg-4 col-md-6">
              <div
                className="card border-0 shadow-sm rounded-4 text-center h-100 p-4"
                style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                onClick={() => handleGenderSelect("female")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div className="mb-3">
                  <FaVenusMars size={40} className="text-danger" />
                </div>

                <h4 className="fw-bold mb-2">Vous etes une Femmes</h4>

                <p className="text-muted mb-4">
                  Rejoignez les premières femmes inscrites sur NouMatch et découvrez une nouvelle façon de faire des rencontres près de vous.
                </p>

                <button className="btn btn-danger w-100 py-2 rounded-pill">
                  Espace Femmes
                </button>
              </div>
            </div>

            {/* Men Card - Can be temporarily blocked */}
            <div className="col-lg-4 col-md-6">
              <div
                className="card border-0 shadow-sm rounded-4 text-center h-100 p-4"
                style={{
                  cursor: isMenBlocked ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  opacity: isMenBlocked ? 0.85 : 1
                }}
                onClick={() => {
                  if (isMenBlocked) return;
                  handleGenderSelect("male");
                }}
                onMouseEnter={(e) => {
                  if (!isMenBlocked) {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMenBlocked) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }
                }}
              >
                <div className="mb-3">
                  <FaVenusMars size={40} className="text-primary" />
                </div>

                <h4 className="fw-bold mb-2">Vous etes un Hommes</h4>

                <p className="text-muted mb-4">
                  Rejoignez NouMatch pour découvrir une expérience pensée pour des rencontres plus sincères et plus locales.
                </p>

                <button
                  className="btn btn-primary w-100 py-2 rounded-pill"
                  disabled={isMenBlocked}
                >
                  {isMenBlocked ? "Revenir plus tard" : "Espace Hommes"}
                </button>

                {/* Soft block message for men */}
                {isMenBlocked && (
                  <div className="mt-3 text-center" style={{ fontSize: "0.85rem" }}>
                    <FaInfoCircle className="text-warning me-1" />
                    <span className="text-muted">
                      Accès temporairement limité pour garantir une communauté équilibrée et une meilleure expérience. Merci de revenir plus tard.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-5 bg-white" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold display-6">Pourquoi rejoindre la liste d’attente NouMatch ?</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Rejoignez dès maintenant et faites partie des premiers à découvrir l’expérience
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="100">
              <div className="text-center p-4">
                <div
                  className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaRocket className="text-danger fs-2" />
                </div>
                <h5 className="fw-bold">Accès prioritaire aux nouveautés</h5>
                <p className="text-muted">Recevez en premier les informations importantes et l’annonce du lancement</p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
              <div className="text-center p-4">
                <div
                  className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaGift className="text-danger fs-2" />
                </div>
                <h5 className="fw-bold">Inscription gratuite</h5>
                <p className="text-muted">
                  Rejoindre la liste d’attente est simple, gratuit et sans engagement
                </p>
              </div>
            </div>

            <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
              <div className="text-center p-4">
                <div
                  className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <FaShieldAlt className="text-danger fs-2" />
                </div>
                <h5 className="fw-bold">Rencontres plus proches de vous</h5>
                <p className="text-muted">
                  Découvrez des profils en Haïti et créez des connexions plus naturelles, plus locales
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-5 bg-light" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="fw-bold display-6">Questions fréquentes</h2>
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
                    <FaChevronUp className="text-danger" />
                  ) : (
                    <FaChevronDown className="text-danger" />
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
                    Nous préparons actuellement le lancement de NouMatch. Les personnes inscrites sur la liste d’attente seront informées en priorité dès l’ouverture.
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
                <button
                  onClick={() => toggleFaq(2)}
                  className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                  style={{ borderRadius: "0", border: "none" }}
                >
                  <span className="fw-semibold fs-5">Pourquoi dois-je m'inscrire sur une liste d'attente ?</span>
                  {openFaq === 2 ? (
                    <FaChevronUp className="text-danger" />
                  ) : (
                    <FaChevronDown className="text-danger" />
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
                    La liste d’attente vous permet de réserver votre place, d’être informé en priorité et de faire partie des premiers à découvrir NouMatch.
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
                    <FaChevronUp className="text-danger" />
                  ) : (
                    <FaChevronDown className="text-danger" />
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
                    Non. L’inscription sur la liste d’attente est entièrement gratuite.
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
        @media (max-width: 768px) {
          .waitlist-page {
            padding-top: 70px;
          }
        }
        .btn:focus {
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}