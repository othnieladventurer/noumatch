import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/public-redesign.css";
import "../styles/legal.css";

const SECTIONS = [
  {
    num: "01",
    title: "Éligibilité",
    content: (
      <ul className="nm-legal-ul">
        <li>Vous devez avoir au moins <strong>18 ans</strong> pour créer un compte</li>
        <li>Vous devez fournir des informations exactes et à jour</li>
        <li>Une seule personne par compte (pas de comptes partagés)</li>
        <li>Les casiers judiciaires ou antécédents violents entraînent une interdiction immédiate</li>
      </ul>
    ),
  },
  {
    num: "02",
    title: "Création et responsabilité du compte",
    content: (
      <ul className="nm-legal-ul">
        <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
        <li>Toute activité sur votre compte est de votre responsabilité</li>
        <li>Nous nous réservons le droit de suspendre ou supprimer un compte pour non-respect des conditions</li>
        <li>Vous devez signaler immédiatement toute utilisation non autorisée de votre compte</li>
        <li>Un seul compte par personne (les comptes multiples sont interdits)</li>
      </ul>
    ),
  },
  {
    num: "03",
    title: "Contenu et comportement",
    content: (
      <>
        <p className="nm-legal-text">Vous vous engagez à :</p>
        <ul className="nm-legal-ul">
          <li>Ne pas poster de contenu offensant, discriminatoire ou illégal</li>
          <li>Respecter les autres utilisateurs et leurs préférences</li>
          <li>Ne pas utiliser l'application pour harceler ou tromper quelqu'un</li>
          <li>Publier uniquement des photos récentes et authentiques</li>
          <li>Maintenir des conversations respectueuses et bienveillantes</li>
          <li>Signaler tout comportement inapproprié ou suspect</li>
        </ul>
        <div className="nm-legal-note">
          <strong>Interdictions strictes :</strong> Propos haineux, harcèlement, sollicitation commerciale, usurpation d'identité, contenus sexuellement explicites, promotion de produits illégaux.
        </div>
      </>
    ),
  },
  {
    num: "04",
    title: "Propriété intellectuelle",
    content: (
      <>
        <p className="nm-legal-text">Vous conservez la propriété de votre contenu, mais en utilisant NouMatch, vous nous accordez :</p>
        <ul className="nm-legal-ul">
          <li>Une licence non exclusive pour afficher et utiliser votre contenu dans le cadre de l'application</li>
          <li>Le droit de modérer, adapter ou supprimer tout contenu violant nos conditions</li>
          <li>La possibilité d'utiliser des images anonymisées pour des campagnes promotionnelles</li>
        </ul>
        <p className="nm-legal-text" style={{ marginTop: "1rem" }}>Tous les logos, noms et éléments graphiques de NouMatch sont protégés par les droits d'auteur.</p>
      </>
    ),
  },
  {
    num: "05",
    title: "Notifications et communication",
    content: (
      <>
        <p className="nm-legal-text">En utilisant l'application, vous acceptez de recevoir :</p>
        <div className="nm-legal-grid cols-2">
          <div className="nm-legal-grid-card">
            <strong>Notifications push</strong>
            <span>Matchs, messages et interactions</span>
          </div>
          <div className="nm-legal-grid-card">
            <strong>Emails transactionnels</strong>
            <span>Confirmations, alertes de sécurité</span>
          </div>
        </div>
        <p className="nm-legal-text" style={{ marginTop: "1.1rem" }}>
          Vous pouvez gérer vos préférences de notification dans les paramètres de l'application ou de votre appareil.
        </p>
      </>
    ),
  },
  {
    num: "06",
    title: "Modifications et suspension",
    content: (
      <ul className="nm-legal-ul">
        <li>Nous pouvons mettre à jour les conditions à tout moment</li>
        <li>Les utilisateurs seront informés des modifications par email ou notification</li>
        <li>Nous pouvons suspendre temporairement l'application pour maintenance ou raisons de sécurité</li>
        <li>Les comptes inactifs pendant plus de 12 mois peuvent être supprimés</li>
      </ul>
    ),
  },
  {
    num: "07",
    title: "Abonnements et paiements",
    content: (
      <>
        <div className="nm-legal-grid cols-1">
          <div className="nm-legal-grid-card">
            <strong>Formule Premium — 19,99€/mois</strong>
            <span>Accès illimité aux likes, voir qui vous aime</span>
          </div>
          <div className="nm-legal-grid-card">
            <strong>Formule God Mode — 49,99€/mois</strong>
            <span>Boost de profil, lecture de messages, support prioritaire</span>
          </div>
        </div>
        <p className="nm-legal-text" style={{ marginTop: "1.1rem" }}>
          Les abonnements sont automatiquement renouvelés sauf annulation 24h avant la fin de la période. Les remboursements sont traités conformément à la politique de l'App Store ou Google Play.
        </p>
      </>
    ),
  },
  {
    num: "08",
    title: "Limitation de responsabilité",
    content: (
      <>
        <ul className="nm-legal-ul">
          <li>NouMatch ne peut garantir la rencontre d'un partenaire</li>
          <li>Nous ne sommes pas responsables des interactions ou disputes entre utilisateurs</li>
          <li>Nous ne sommes pas responsables des interruptions de service indépendantes de notre volonté</li>
          <li>Nous ne pouvons garantir une disponibilité continue de tous les services</li>
        </ul>
        <div className="nm-legal-note">
          <strong>Important :</strong> NouMatch est une plateforme de rencontre, mais nous ne réalisons pas de vérification approfondie des antécédents. Restez vigilant et protégez vos informations personnelles.
        </div>
      </>
    ),
  },
  {
    num: "09",
    title: "Résiliation",
    content: (
      <>
        <p className="nm-legal-text">Vous pouvez supprimer votre compte à tout moment dans les paramètres. En cas de violation grave de nos conditions, nous nous réservons le droit de :</p>
        <ul className="nm-legal-ul">
          <li>Vous avertir et suspendre temporairement votre compte</li>
          <li>Supprimer définitivement votre compte sans préavis</li>
          <li>Interdire la création d'un nouveau compte</li>
          <li>Signaler les comportements illégaux aux autorités compétentes</li>
        </ul>
      </>
    ),
  },
  {
    num: "10",
    title: "Juridiction et lois applicables",
    content: (
      <>
        <p className="nm-legal-text">
          Ces conditions sont régies par la législation applicable dans votre pays de résidence. En cas de litige, nous privilégions la médiation avant toute action légale.
        </p>
        <div className="nm-legal-grid cols-2">
          <div className="nm-legal-grid-card">
            <strong>Médiation</strong>
            <span>Solution privilégiée avant toute action judiciaire</span>
          </div>
          <div className="nm-legal-grid-card">
            <strong>Conformité RGPD</strong>
            <span>Pour les utilisateurs européens</span>
          </div>
        </div>
      </>
    ),
  },
];

export default function Terms() {
  useEffect(() => {
    document.documentElement.classList.add("legal-page");
    return () => document.documentElement.classList.remove("legal-page");
  }, []);

  return (
    <>
      <div className="nm-legal-hero">
        <div className="container">
          <span className="nm-section-tag">Légal</span>
          <h1 className="nm-legal-hero-title">Conditions d'utilisation</h1>
          <p className="nm-legal-hero-date">Dernière mise à jour : 22 mars 2026</p>
        </div>
      </div>

      <div className="nm-legal-body">
        <div className="container">
          <div className="nm-legal-inner">
            <p className="nm-legal-lead">
              Les présentes conditions régissent votre utilisation de <strong>NouMatch</strong>, une application de rencontres pour rencontrer des personnes de manière authentique et respectueuse.
              En utilisant l'application, vous acceptez ces conditions.
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
              <p>Pour toute question concernant ces conditions, contactez-nous directement.</p>
              <Link to="/#contact" className="nm-btn nm-btn-primary">Nous contacter</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
