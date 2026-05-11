import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaCheckCircle, FaHeart, FaComments } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import FeaturesSection from "../components/FeaturesSection";
import TestimonialsCarousel from "../components/TestimonialsCarousel";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import AOS from "aos";
import "aos/dist/aos.css";
import "../styles/public-redesign.css";

const STEPS = [
  {
    num: "01",
    icon: <FaUser />,
    title: "Créez votre profil",
    desc: "Renseignez vos infos, ajoutez vos photos et partagez vos centres d'intérêt. Un profil complet attire les bonnes personnes.",
  },
  {
    num: "02",
    icon: <FaCheckCircle />,
    title: "Vérifiez votre identité",
    desc: "Confirmez votre email pour garantir l'authenticité de votre profil. Une communauté vérifiée, c'est plus de confiance.",
  },
  {
    num: "03",
    icon: <FaHeart />,
    title: "Swipez & matchez",
    desc: "Parcourez les profils près de vous, likez ceux qui vous intéressent. Quand vous matchez, c'est le début d'une belle histoire !",
  },
  {
    num: "04",
    icon: <FaComments />,
    title: "Discutez librement",
    desc: "Une fois le match confirmé, lancez-vous ! Discutez, apprenez à vous connaître et laissez la magie opérer.",
  },
];

export default function Home() {
  useEffect(() => {
    AOS.init({ duration: 900, once: true, easing: "ease-out-cubic" });
  }, []);

  return (
    <>
      <style>{`
        html, body, #root {
          height: auto !important;
          min-height: 100vh !important;
          overflow: visible !important;
          overflow-y: auto !important;
          position: relative !important;
        }
        .overflow-hidden { overflow: visible !important; }
      `}</style>

      {/* ── HERO ── */}
      <section className="nm-hero-v2">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6" data-aos="fade-right">
              <div className="nm-hero-tag">
                <span className="nm-hero-tag-dot" />
                Rencontres authentiques
              </div>
              <h1>
                Des rencontres<br />
                <span className="nm-accent">vraies.</span> Pour<br />
                des gens vrais.
              </h1>
              <p className="nm-hero-subtitle">
                Un espace sincère pour trouver des connexions qui durent.
                Discutez, découvrez, créez des liens naturellement.
              </p>
              <div className="nm-hero-actions">
                <Link to="/register" className="nm-btn nm-btn-primary">Créer mon compte</Link>
                <Link to="/login" className="nm-btn nm-btn-secondary">Se connecter</Link>
              </div>
              <div className="nm-hero-stats">
                <div>
                  <span className="nm-hero-stat-value">2 400+</span>
                  <span className="nm-hero-stat-label">Membres actifs</span>
                </div>
                <div>
                  <span className="nm-hero-stat-value">100%</span>
                  <span className="nm-hero-stat-label">Profils vérifiés</span>
                </div>
                <div>
                  <span className="nm-hero-stat-value">Gratuit</span>
                  <span className="nm-hero-stat-label">Pour commencer</span>
                </div>
              </div>
            </div>
            <div className="col-lg-6 d-none d-lg-block" data-aos="fade-left">
              <div className="nm-hero-media">
                <img
                  className="nm-hero-img"
                  src="https://images.pexels.com/photos/7741585/pexels-photo-7741585.jpeg?auto=compress&cs=tinysrgb&w=1600"
                  alt="Couple heureux sur NouMatch"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO WE ARE ── */}
      <section id="who" className="nm-section nm-section-white">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6" data-aos="fade-right">
              <img
                src="https://img.freepik.com/premium-photo/happy-love-relax-couple-walking-city-date-together-their-getaway-break-summer-travel-smile-with-young-black-man-woman-holding-hands-street-their-vacation-trip_590464-81239.jpg?w=360"
                alt="Rencontres sincères"
                className="nm-split-img"
              />
            </div>
            <div className="col-lg-6" data-aos="fade-left">
              <span className="nm-section-tag">Qui sommes-nous</span>
              <h2 className="nm-section-title">NouMatch</h2>
              <p style={{ color: "#475569", lineHeight: "1.75", marginBottom: "1rem" }}>
                NouMatch crée un espace où les rencontres se font avec sincérité et respect.
              </p>
              <p style={{ color: "#475569", lineHeight: "1.75", marginBottom: "1rem" }}>
                Chaque rencontre compte et chaque échange peut devenir une véritable connexion.
              </p>
              <p style={{ color: "#475569", lineHeight: "1.75", marginBottom: "2rem" }}>
                Notre mission : rendre les rencontres en ligne authentiques, humaines et enrichissantes.
              </p>
              <Link to="/register" className="nm-btn nm-btn-primary">Rejoindre la communauté</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="features" className="nm-section nm-section-cream">
        <div className="container">
          <div className="text-center mb-5" data-aos="fade-up">
            <span className="nm-section-tag">Comment ça marche</span>
            <h2 className="nm-section-title">Simple. Sincère. Naturel.</h2>
            <p className="nm-section-desc">
              Quatre étapes simples pour trouver des connexions authentiques sur NouMatch.
            </p>
          </div>
          <div className="row g-4">
            {STEPS.map((step, i) => (
              <div className="col-sm-6 col-lg-3" key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                <div className="nm-step-card">
                  <span className="nm-step-num">{step.num}</span>
                  <div className="nm-step-icon">{step.icon}</div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOUMATCH SPIRIT ── */}
      <FeaturesSection />

      {/* ── CTA SPLIT ── */}
      <section className="nm-section nm-section-white" data-aos="fade-up">
        <div className="container">
          <div className="row align-items-center g-5 flex-lg-row-reverse">
            <div className="col-lg-6">
              <img
                src="https://img.freepik.com/premium-photo/love-phone-social-media-with-black-couple-sofa-home-living-room-together-relax-app-happy-smile-with-man-woman-apartment-streaming-with-bonding-online-shopping_590464-495126.jpg?semt=ais_hybrid&w=740&q=80"
                alt="Passez au réel"
                className="nm-split-img"
              />
            </div>
            <div className="col-lg-6">
              <span className="nm-section-tag">L'expérience NouMatch</span>
              <h2 className="nm-section-title">Passez du virtuel au réel</h2>
              <p style={{ color: "#64748b", lineHeight: "1.75", marginBottom: "2rem" }}>
                Rencontrez des personnes qui partagent vos valeurs, vos centres d'intérêt et votre énergie.
                Discutez, riez, créez des liens et laissez la rencontre se faire naturellement.
              </p>
              <Link to="/register" className="nm-btn nm-btn-primary">Engage la conversation</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── DARK CTA BAND ── */}
      <section className="nm-dark-cta">
        <div className="nm-dark-cta-overlay" />
        <div className="container">
          <div className="nm-dark-cta-inner" data-aos="fade-up">
            <h2>Bienvenue sur NouMatch</h2>
            <p>
              Connectez-vous pour continuer votre parcours vers des connexions authentiques et significatives.
              Accédez à votre profil et découvrez vos matchs dès maintenant.
            </p>
            <Link to="/login" className="nm-btn nm-btn-light">Se connecter</Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsCarousel />

      {/* ── FAQ ── */}
      <Faq />

      {/* ── CONTACT ── */}
      <Contact />
    </>
  );
}
