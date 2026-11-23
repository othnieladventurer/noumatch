import { Link } from "react-router-dom";
import {
  FaAndroid,
  FaApple,
  FaArrowRight,
  FaComments,
  FaHeart,
  FaInstagram,
  FaShieldAlt,
} from "react-icons/fa";
import appPreview from "../assets/apptease.png";
import "../styles/application-mobile.css";

const highlights = [
  {
    icon: <FaHeart />,
    title: "Des profils près de vous",
    copy: "Photos, bio et centres d’intérêt : découvrez des personnes en Haïti qui vous ressemblent, directement depuis votre téléphone.",
  },
  {
    icon: <FaComments />,
    title: "La discussion après le match",
    copy: "Quand l’intérêt est mutuel, le Noumatch débloque la conversation. Pas de messages non désirés, que de vraies rencontres.",
  },
  {
    icon: <FaShieldAlt />,
    title: "La sécurité au premier plan",
    copy: "Vérification email, blocage et signalement restent au cœur de l’expérience, sur mobile comme partout ailleurs.",
  },
];

export default function ApplicationMobile() {
  return (
    <div className="nm-app">
      <section className="nm-app-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="nm-app-pill">
                <span className="nm-app-pill__dot" />
                Application mobile
              </span>

              <h1>
                Noumatch, l’application mobile{" "}
                <span className="nm-app-accent">arrive bientôt.</span>
              </h1>

              <p className="nm-app-lead">
                Nous préparons une application plus rapide, plus simple et
                entièrement pensée pour le mobile. Vos profils, vos matchs et vos
                conversations vous suivent partout, dans une expérience plus
                fluide que jamais.
              </p>

              <div className="nm-app-platforms">
                <span className="nm-app-platform">
                  <FaApple aria-hidden="true" />
                  iPhone
                  <em>Bientôt</em>
                </span>
                <span className="nm-app-platform">
                  <FaAndroid aria-hidden="true" />
                  Android
                  <em>Bientôt</em>
                </span>
              </div>

              <div className="nm-app-actions">
                <Link to="/waitlist" className="nm-app-btn nm-app-btn--primary">
                  Rejoindre la liste d’attente
                  <FaArrowRight aria-hidden="true" />
                </Link>
                <a href="#apercu" className="nm-app-btn nm-app-btn--ghost">
                  Voir l’aperçu
                </a>
              </div>

              <p className="nm-app-note">
                Les premières personnes inscrites seront prévenues en priorité
                dès la sortie de l’application.
              </p>
            </div>

            <div className="col-lg-6">
              <div className="nm-app-visual">
                <div className="nm-app-visual__frame">
                  <img
                    src={appPreview}
                    alt="Aperçu de l’application mobile Noumatch avec deux profils à découvrir"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                <div className="nm-app-visual__badge">
                  <span>Aperçu de l’app</span>
                  <small>Version mobile en préparation</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="apercu" className="nm-app-section">
        <div className="container">
          <div className="nm-app-heading">
            <span className="nm-app-tag">Ce qui vous attend</span>
            <h2>La même expérience Noumatch, en mieux</h2>
            <p>
              L’application mobile reprend l’essentiel de Noumatch et le pense
              pour un usage au quotidien : rapide à ouvrir, agréable à parcourir
              et simple à utiliser.
            </p>
          </div>

          <div className="nm-app-cards">
            {highlights.map((item) => (
              <article key={item.title} className="nm-app-card">
                <div className="nm-app-card__icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nm-app-cta">
        <div className="container">
          <div className="nm-app-cta__inner">
            <h2>Soyez les premiers à télécharger Noumatch</h2>
            <p>
              Laissez-nous votre email sur la liste d’attente : nous vous
              préviendrons dès que l’application sera disponible sur l’App Store
              et Google Play.
            </p>

            <div className="nm-app-cta__actions">
              <Link to="/waitlist" className="nm-app-btn nm-app-btn--light">
                Rejoindre la liste d’attente
              </Link>
              <a
                href="https://www.instagram.com/noumatchhaiti?igsh=eDM0eHp4aDhwcDFh"
                target="_blank"
                rel="noopener noreferrer"
                className="nm-app-btn nm-app-btn--outline"
              >
                <FaInstagram aria-hidden="true" />
                Suivre sur Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
