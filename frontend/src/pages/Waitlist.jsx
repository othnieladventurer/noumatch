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
                Découvrez{" "}
                <span className="text-danger">NouMatch</span> en Haïti
              </h1>

              

              
              <p className="text-light mb-0">
                <FaHeart className="text-danger me-1" />
                Soyez parmi les premiers à trouvez voos "NouMatch" quand nous ouvrirons, Rejoingez la liste d'attente pour le pré-lancement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div className="container mt-3" style={{ position: "relative", zIndex: 2 }}>
          <div className="alert alert-danger text-center">
            <FaInfoCircle className="me-2" />
            {error}
          </div>
        </div>
      )}

      {/* Gender Selection Section */}
      <section className="py-5" style={{ position: "relative", zIndex: 2 }}>
        <div className="container px-3">
          <div className="text-center mb-5" data-aos="fade-up">
            <h2 className="display-5 fw-bold mb-3">Choisissez votre espace</h2>
            <p className="lead text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Sélectionnez votre genre pour accéder à un parcours d'inscription personnalisé.
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

                <h4 className="fw-bold mb-2">Femmes</h4>

                <p className="text-muted mb-4">
                  Faites partie des premières femmes à découvrir NouMatch et contribuez à façonner une expérience qui vous ressemble.
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

                <h4 className="fw-bold mb-2">Hommes</h4>

                <p className="text-muted mb-4">
                  Rejoignez un espace conçu pour des rencontres sincères, où la qualité prime sur la quantité.
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
                      Accès temporairement limité pour garantir une communauté équilibrée. Merci de revenir plus tard.
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
            <h2 className="fw-bold display-6">Pourquoi rejoindre la liste d'attente ?</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
              Les premiers inscrits bénéficient d'avantages exclusifs
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
                <h5 className="fw-bold">Information prioritaire</h5>
                <p className="text-muted">Recevez en premier les actualités et la date d'ouverture de NouMatch</p>
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
                <h5 className="fw-bold">Compte gratuit</h5>
                <p className="text-muted">
                  L'inscription sur la liste d'attente est gratuite et sans engagement
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
                <h5 className="fw-bold">Communauté locale</h5>
                <p className="text-muted">
                  Rencontrez des personnes qui partagent votre culture et vos valeurs
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