import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaBookOpen, FaCheckCircle } from "react-icons/fa";
import { GUIDES_INDEX_FAQ } from "../lib/seo";
import "../styles/guide-page.css";

const PX = (id, w = 900, h = 700) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

const GUIDES = [
  {
    path: "/rencontres-port-au-prince",
    category: "Rencontrer",
    title: "Rencontre à Port-au-Prince : conseils et idées de rendez-vous",
    description:
      "Choisir un lieu public, proposer un rendez-vous sans pression et garder les bons réflexes une fois sur place.",
    image: PX(3799180),
    alt: "Jeune homme utilisant son téléphone en ville",
  },
  {
    path: "/securite-rencontres-en-ligne",
    category: "Sécurité",
    title: "Sécurité des rencontres en ligne : 10 règles à connaître",
    description:
      "Reconnaître les signaux d'alerte, protéger vos informations et préparer un premier rendez-vous plus serein.",
    image: PX(6311486),
    alt: "Jeune femme souriante dans un café",
  },
  {
    path: "/application-rencontre-haiti",
    category: "Choisir",
    title: "Application de rencontre en Haïti : comment bien choisir",
    description:
      "Les critères qui comptent vraiment, ce qui est gratuit et comment créer un profil qui inspire confiance.",
    image: PX(6146927),
    alt: "Jeune homme consultant une application sur son téléphone",
  },
];

export default function Guides() {
  return (
    <div className="nm-guide">
      <header className="nm-guides-index-hero">
        <div className="nm-guide-container">
          <nav className="nm-guide-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Guides</span>
          </nav>
          <span className="nm-guide-eyebrow">Ressources NouMatch</span>
          <h1>Guides de rencontres en Haïti</h1>
          <p>
            Des conseils concrets pour faire connaissance plus sereinement :
            préparer un premier rendez-vous, reconnaître les signaux d'alerte et
            choisir une application adaptée à votre quotidien en Haïti.
          </p>
        </div>
      </header>

      <section className="nm-guides-index" aria-labelledby="guides-list-title">
        <div className="nm-guide-container">
          <h2 id="guides-list-title" className="visually-hidden">
            Tous les guides
          </h2>
          <div className="nm-guides-index-grid">
            {GUIDES.map((guide) => (
              <Link key={guide.path} to={guide.path} className="nm-guides-card">
                <div className="nm-guides-card-media">
                  <img src={guide.image} alt={guide.alt} loading="lazy" decoding="async" />
                </div>
                <div className="nm-guides-card-body">
                  <span>{guide.category}</span>
                  <h2>{guide.title}</h2>
                  <p>{guide.description}</p>
                  <strong>
                    Lire le guide <FaArrowRight aria-hidden="true" />
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="nm-guides-why" aria-labelledby="guides-why-title">
        <div className="nm-guide-container">
          <span className="nm-guide-eyebrow">Pourquoi ces guides</span>
          <h2 id="guides-why-title">Des réponses aux questions que l'on se pose vraiment</h2>
          <p>
            Faire une rencontre en ligne soulève des questions très concrètes :
            où se retrouver, quoi dire, comment vérifier que la personne est bien
            celle qu'elle prétend être, ou encore comment réagir si un échange
            devient insistant. Ces guides rassemblent des réponses pratiques,
            pensées pour la réalité des rencontres en Haïti.
          </p>
          <p>
            NouMatch privilégie les profils avec photo, la vérification de
            l'adresse email et la discussion après un intérêt mutuel. Ces règles
            ne remplacent pas votre jugement, mais elles donnent un cadre plus
            clair pour commencer.
          </p>

          <div className="nm-guide-summary" style={{ marginTop: "1.5rem", marginBottom: 0 }}>
            <h2>À retenir avant de commencer</h2>
            <ul>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Un premier rendez-vous se prépare : lieu public, horaire clair, transport prévu.</span>
              </li>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Une photo récente et une bio précise valent mieux qu'un profil rempli à la hâte.</span>
              </li>
              <li>
                <FaCheckCircle aria-hidden="true" />
                <span>Vous pouvez toujours interrompre un échange ou un rendez-vous qui ne vous met pas à l'aise.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="nm-guide-body" aria-labelledby="guides-faq-title">
        <div className="nm-guide-container" style={{ maxWidth: 760 }}>
          <h2 id="guides-faq-title" style={{ fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "1rem" }}>
            Questions fréquentes
          </h2>
          <div className="nm-guide-faq" style={{ marginBottom: 0 }}>
            {GUIDES_INDEX_FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="nm-guide-related">
        <div className="nm-guide-container">
          <div className="nm-guide-summary" style={{ marginBottom: 0 }}>
            <h2>
              <FaBookOpen aria-hidden="true" style={{ marginRight: "0.5rem" }} />
              Prêt(e) à passer à la pratique ?
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.7, margin: "0 0 1.15rem" }}>
              Créez un profil gratuit, ajoutez une photo récente et commencez à
              découvrir des personnes qui partagent vos valeurs en Haïti.
            </p>
            <Link to="/register" className="nm-guide-btn">
              Créer mon profil <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
