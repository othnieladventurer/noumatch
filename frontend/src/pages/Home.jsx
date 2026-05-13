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
import heroMeetingImage from "../assets/marketing/hero-meeting.png";
import virtualToRealImage from "../assets/marketing/virtual-to-real.png";

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
    desc: "Parcourez les profils près de vous et signalez les personnes qui retiennent votre attention. Quand l'intérêt est mutuel, la conversation peut commencer.",
  },
  {
    num: "04",
    icon: <FaComments />,
    title: "Discutez librement",
    desc: "Une fois le match confirmé, échangez librement, apprenez à vous connaître et voyez si le courant passe naturellement.",
  },
];

export default function Home() {
  useEffect(() => {
    AOS.init({ duration: 900, once: true, easing: "ease-out-cubic" });
  }, []);

  return (
    <>
      {/* ── HERO ── */}
      <section className="nm-hero-v2">
        <div className="container">
          <div className="row align-items-center gy-5 gx-lg-5">
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
                Un espace sincère pour découvrir des personnes, échanger simplement
                et faire naître des liens naturels autour de vraies conversations.
              </p>
              <div className="nm-hero-actions">
                <Link to="/register" className="nm-btn nm-btn-primary">Créer mon compte</Link>
                <Link to="/login" className="nm-btn nm-btn-secondary">Se connecter</Link>
              </div>
            </div>
            <div className="col-lg-6 d-none d-lg-flex align-items-stretch" data-aos="fade-left">
              <div className="nm-hero-media w-100">
                <img
                  className="nm-hero-img"
                  src={heroMeetingImage}
                  alt="Personnes en conversation dans un café"
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
                src="https://images.pexels.com/photos/36765309/pexels-photo-36765309.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Deux personnes discutent autour d'un café"
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
                src={virtualToRealImage}
                alt="Première rencontre dans un cadre convivial"
                className="nm-split-img"
              />
            </div>
            <div className="col-lg-6">
              <span className="nm-section-tag">L'expérience NouMatch</span>
              <h2 className="nm-section-title">Passez du virtuel au réel</h2>
              <p style={{ color: "#64748b", lineHeight: "1.75", marginBottom: "2rem" }}>
                Rencontrez des personnes qui partagent vos valeurs et vos centres d'intérêt.
                Discutez, apprenez à vous connaître et laissez l'échange se construire naturellement.
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
