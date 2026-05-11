import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/public-redesign.css";
import "../styles/legal.css";

const SECTIONS = [
  {
    num: "01",
    title: "Informations collectées",
    content: (
      <ul className="nm-legal-ul">
        <li>Informations personnelles : nom, prénom, email, date de naissance, genre, localisation</li>
        <li>Contenu du profil : photos, bio, intérêts, préférences</li>
        <li>Activité sur l'application : messages, likes, matchs, interactions</li>
        <li>Données techniques : adresse IP, type de navigateur, appareil utilisé</li>
        <li>Données de localisation (avec votre consentement)</li>
      </ul>
    ),
  },
  {
    num: "02",
    title: "Utilisation des informations",
    content: (
      <ul className="nm-legal-ul">
        <li>Pour créer et personnaliser votre expérience NouMatch</li>
        <li>Pour permettre la communication et les connexions entre utilisateurs</li>
        <li>Pour améliorer nos services et détecter les comportements inappropriés</li>
        <li>Pour vous envoyer des notifications, emails ou messages liés à votre compte</li>
        <li>Pour vous proposer des suggestions de profils pertinents dans votre région</li>
        <li>Pour analyser et optimiser les performances de l'application</li>
      </ul>
    ),
  },
  {
    num: "03",
    title: "Partage et confidentialité",
    content: (
      <>
        <p className="nm-legal-text">Nous ne vendons ni ne louons vos données à des tiers. Vos informations personnelles sont partagées uniquement :</p>
        <ul className="nm-legal-ul">
          <li>Avec d'autres utilisateurs dans le cadre de l'application (ex. photos de profil, bio)</li>
          <li>Pour des raisons légales ou de sécurité si la loi l'exige</li>
          <li>Avec des prestataires techniques pour le stockage sécurisé et la livraison de nos services</li>
          <li>Pour la modération et la prévention des abus</li>
        </ul>
      </>
    ),
  },
  {
    num: "04",
    title: "Sécurité des données",
    content: (
      <>
        <p className="nm-legal-text">Nous utilisons des mesures techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, notamment :</p>
        <ul className="nm-legal-ul">
          <li>Chiffrement SSL/TLS pour toutes les transmissions de données</li>
          <li>Stockage sécurisé avec accès restreint</li>
          <li>Surveillance continue des activités suspectes</li>
          <li>Authentification à deux facteurs (disponible prochainement)</li>
        </ul>
      </>
    ),
  },
  {
    num: "05",
    title: "Cookies et technologies similaires",
    content: (
      <>
        <p className="nm-legal-text">Nous utilisons des cookies pour analyser l'utilisation, améliorer l'expérience utilisateur et afficher des contenus pertinents. Vous pouvez gérer vos préférences dans votre navigateur.</p>
        <div className="nm-legal-grid">
          <div className="nm-legal-grid-card">
            <strong>Cookies essentiels</strong>
            <span>Nécessaires au fonctionnement de l'application</span>
          </div>
          <div className="nm-legal-grid-card">
            <strong>Cookies analytiques</strong>
            <span>Pour améliorer nos services</span>
          </div>
          <div className="nm-legal-grid-card">
            <strong>Cookies de préférences</strong>
            <span>Pour personnaliser votre expérience</span>
          </div>
        </div>
      </>
    ),
  },
  {
    num: "06",
    title: "Vos droits",
    content: (
      <>
        <div className="nm-legal-rights-grid">
          <ul className="nm-legal-ul">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (suppression)</li>
          </ul>
          <ul className="nm-legal-ul">
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition au traitement</li>
            <li>Droit à la limitation du traitement</li>
          </ul>
        </div>
        <div className="nm-legal-note">
          Pour exercer vos droits, contactez-nous à <strong>privacy@noumatch.com</strong>
        </div>
      </>
    ),
  },
  {
    num: "07",
    title: "Conditions internationales",
    content: (
      <p className="nm-legal-text">
        NouMatch est accessible depuis plusieurs pays. Nous respectons les lois locales sur la protection des données, y compris le RGPD pour les utilisateurs en Europe.
      </p>
    ),
  },
  {
    num: "08",
    title: "Conservation des données",
    content: (
      <p className="nm-legal-text">
        Nous conservons vos données aussi longtemps que votre compte est actif. Après suppression de votre compte, vos données sont supprimées dans un délai de 30 jours, sauf si nous sommes légalement tenus de les conserver plus longtemps.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    document.documentElement.classList.add("legal-page");
    return () => document.documentElement.classList.remove("legal-page");
  }, []);

  return (
    <>
      <div className="nm-legal-hero">
        <div className="container">
          <span className="nm-section-tag">Légal</span>
          <h1 className="nm-legal-hero-title">Politique de confidentialité</h1>
          <p className="nm-legal-hero-date">Dernière mise à jour : 22 mars 2026</p>
        </div>
      </div>

      <div className="nm-legal-body">
        <div className="container">
          <div className="nm-legal-inner">
            <p className="nm-legal-lead">
              Chez <strong>NouMatch</strong>, votre vie privée et la sécurité de vos données sont notre priorité.
              Cette politique explique quelles informations nous collectons, comment nous les utilisons et vos droits en tant qu'utilisateur.
            </p>

            {SECTIONS.map((s) => (
              <div className="nm-legal-section" key={s.num}>
                <span className="nm-legal-num-tag">{s.num}</span>
                <h2 className="nm-legal-section-h">{s.title}</h2>
                {s.content}
              </div>
            ))}

            <div className="nm-legal-cta">
              <h3>Des questions ?</h3>
              <p>Pour toute question concernant cette politique, contactez-nous directement.</p>
              <Link to="/#contact" className="nm-btn nm-btn-primary">Nous contacter</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
