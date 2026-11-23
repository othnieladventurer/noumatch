import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaCheckCircle, FaClock, FaShieldAlt } from "react-icons/fa";
import "../styles/guide-page.css";

export default function GuideArticle({
  eyebrow = "Guide pratique",
  title,
  lead,
  updated = "22 novembre 2026",
  readingTime = "6 min",
  heroImage,
  heroAlt,
  summary = [],
  sections = [],
  faq = [],
  related = [],
  ctaTitle = "Prêt(e) à faire une vraie rencontre ?",
  ctaText = "Créez votre profil gratuitement et découvrez des personnes qui partagent vos valeurs en Haïti.",
}) {
  return (
    <div className="nm-guide">
      <header className="nm-guide-hero">
        <div className="nm-guide-container">
          <nav className="nm-guide-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <Link to="/guides">Guides</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>

          <div className="nm-guide-hero-grid">
            <div>
              <span className="nm-guide-eyebrow">{eyebrow}</span>
              <h1>{title}</h1>
              <p className="nm-guide-lead">{lead}</p>

              <div className="nm-guide-meta">
                <span>
                  <FaClock aria-hidden="true" /> {readingTime} de lecture
                </span>
                <span>Mis à jour le {updated}</span>
              </div>
            </div>

            {heroImage && (
              <figure className="nm-guide-hero-media">
                <img src={heroImage} alt={heroAlt || ""} fetchPriority="high" decoding="async" />
              </figure>
            )}
          </div>
        </div>
      </header>

      <div className="nm-guide-body">
        <div className="nm-guide-container nm-guide-layout">
          <aside className="nm-guide-aside">
            <nav className="nm-guide-toc" aria-label="Sommaire du guide">
              <span className="nm-guide-toc-title">Dans ce guide</span>
              <ol>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="nm-guide-aside-cta">
              <FaShieldAlt aria-hidden="true" />
              <h2>Des rencontres plus sereines</h2>
              <p>Un profil complet, une photo réelle et une messagerie après match : voilà la base.</p>
              <Link to="/register" className="nm-guide-btn">
                Créer mon profil <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          </aside>

          <article className="nm-guide-article">
            {summary.length > 0 && (
              <div className="nm-guide-summary">
                <h2>L'essentiel en bref</h2>
                <ul>
                  {summary.map((item) => (
                    <li key={item}>
                      <FaCheckCircle aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="nm-guide-section">
                <h2>{section.title}</h2>
                {section.intro && <p className="nm-guide-intro">{section.intro}</p>}
                {(section.paragraphs || []).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {section.list && (
                  <div className="nm-guide-list-block">
                    {section.list.title && <h3>{section.list.title}</h3>}
                    <ul className="nm-guide-list">
                      {section.list.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.note && <p className="nm-guide-note">{section.note}</p>}
              </section>
            ))}

            {faq.length > 0 && (
              <section className="nm-guide-faq" aria-labelledby="guide-faq-title">
                <h2 id="guide-faq-title">Questions fréquentes</h2>
                {faq.map((item) => (
                  <details key={item.q}>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </section>
            )}

            <section className="nm-guide-cta">
              <span className="nm-guide-eyebrow">NouMatch</span>
              <h2>{ctaTitle}</h2>
              <p>{ctaText}</p>
              <Link to="/register" className="nm-guide-btn">
                Commencer gratuitement <FaArrowRight aria-hidden="true" />
              </Link>
            </section>
          </article>
        </div>
      </div>

      {related.length > 0 && (
        <section className="nm-guide-related" aria-labelledby="guide-related-title">
          <div className="nm-guide-container">
            <h2 id="guide-related-title">Continuer à lire</h2>
            <div className="nm-guide-related-grid">
              {related.map((item) => (
                <Link key={item.path} to={item.path} className="nm-guide-related-card">
                  <span>{item.label}</span>
                  <p>{item.description}</p>
                  <strong>
                    Lire le guide <FaArrowRight aria-hidden="true" />
                  </strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
