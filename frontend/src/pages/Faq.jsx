import React, { useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp, FaHeart, FaQuestionCircle } from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
  }, []);

  const faqs = [
    {
      question: "Comment créer un compte sur NouMatch ?",
      answer: "Pour créer un compte, cliquez sur 'Créer mon compte' sur la page d'accueil. Remplissez vos informations personnelles, ajoutez une photo de profil et vérifiez votre adresse email. C'est simple, rapide et gratuit !"
    },
    {
      question: "Est-ce que NouMatch est vraiment gratuit ?",
      answer: "Oui ! L'inscription et les fonctionnalités de base sont entièrement gratuites. Vous pouvez swiper, matcher et discuter sans frais. Nous proposons également des options premium pour ceux qui souhaitent améliorer leur expérience, mais vous pouvez tout à fait utiliser l'application sans payer."
    },
    {
      question: "Comment fonctionne le système de matching ?",
      answer: "NouMatch utilise un algorithme intelligent basé sur vos centres d'intérêt, votre localisation et vos préférences. Vous pouvez swiper à gauche (pass) ou à droite (like) sur les profils. Lorsque deux personnes se likent mutuellement, c'est un match ! Vous pouvez alors commencer à discuter."
    },
    {
      question: "Mes données personnelles sont-elles sécurisées ?",
      answer: "Absolument ! La sécurité de vos données est notre priorité. Toutes vos informations sont cryptées, nous utilisons des serveurs sécurisés et nous ne partageons jamais vos données personnelles avec des tiers sans votre consentement explicite."
    },
    {
      question: "Comment signaler un comportement inapproprié ?",
      answer: "Vous pouvez signaler un utilisateur en cliquant sur les trois points (...) sur son profil, puis sur 'Signaler'. Notre équipe examinera le signalement dans les plus brefs délais et prendra les mesures nécessaires."
    },
    {
      question: "Puis-je modifier mon profil après l'avoir créé ?",
      answer: "Oui ! Vous pouvez modifier votre profil à tout moment depuis votre tableau de bord. Mettez à jour vos photos, votre bio, vos centres d'intérêt et vos préférences quand vous le souhaitez."
    },
    {
      question: "Comment supprimer mon compte ?",
      answer: "Pour supprimer votre compte, allez dans les paramètres de votre profil, cliquez sur 'Paramètres du compte', puis sur 'Supprimer mon compte'. Cette action est irréversible."
    },
    {
      question: "Que faire si j'oublie mon mot de passe ?",
      answer: "Cliquez sur 'Mot de passe oublié' sur la page de connexion. Vous recevrez un email avec un lien pour réinitialiser votre mot de passe en toute sécurité."
    },
    {
      question: "NouMatch est-il disponible sur mobile ?",
      answer: "Oui ! NouMatch est accessible sur navigateur mobile et nous développons actuellement nos applications iOS et Android. Restez connectés pour l'annonce du lancement !"
    },
    {
      question: "Comment fonctionne l'abonnement premium ?",
      answer: "L'abonnement premium débloque des fonctionnalités exclusives comme : voir qui vous a liké, des super likes, remonter dans les recherches, et bien plus encore."
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div style={{ paddingTop: "60px" }}>
      {/* Hero Section */}
      <section
        className="position-relative d-flex align-items-center text-white text-center"
        style={{
          minHeight: "40vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          position: "relative",
        }}
      >
        <div
          className="position-absolute w-100 h-100"
          style={{
            background: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            top: 0,
            left: 0,
            opacity: 0.1,
          }}
        ></div>
        <div className="container position-relative px-3" data-aos="fade-down">
          <div className="d-inline-block bg-danger bg-opacity-90 text-white px-4 py-2 rounded-pill mb-4">
            <FaQuestionCircle className="me-2" />
            Foire Aux Questions
          </div>
          <h1 className="display-4 fw-bold mb-4">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="lead mb-0 mx-auto" style={{ maxWidth: "600px" }}>
            Trouvez des réponses rapides à vos questions sur NouMatch
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-5 bg-light">
        <div className="container px-3">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="text-center mb-5" data-aos="fade-up">
                <h2 className="fw-bold display-6 mb-3">Questions fréquentes</h2>
                <p className="text-muted">Tout ce que vous devez savoir sur NouMatch</p>
              </div>

              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="card border-0 shadow-sm mb-3 rounded-4 overflow-hidden"
                  data-aos="fade-up"
                  data-aos-delay={index * 50}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="btn bg-white w-100 text-start p-4 d-flex justify-content-between align-items-center"
                    style={{ borderRadius: "0", border: "none" }}
                  >
                    <span className="fw-semibold fs-5">{faq.question}</span>
                    {openIndex === index ? (
                      <FaChevronUp className="text-danger" />
                    ) : (
                      <FaChevronDown className="text-danger" />
                    )}
                  </button>
                  <div
                    style={{
                      maxHeight: openIndex === index ? "300px" : "0",
                      overflow: "hidden",
                      transition: "max-height 0.3s ease-in-out"
                    }}
                  >
                    <div className="p-4 pt-0 text-muted">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="py-5 bg-white" data-aos="fade-up">
        <div className="container px-3 text-center">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="bg-danger bg-opacity-10 rounded-4 p-5">
                <FaHeart className="text-danger fs-1 mb-3" />
                <h3 className="fw-bold mb-3">Vous n'avez pas trouvé votre réponse ?</h3>
                <p className="text-muted mb-4">
                  Notre équipe est là pour vous aider. Contactez-nous et nous vous répondrons dans les plus brefs délais.
                </p>
                <a href="/#/contact" className="btn btn-danger btn-lg px-5 rounded-pill">
                  Nous contacter
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .display-4 {
            font-size: 2rem;
          }
          .display-6 {
            font-size: 1.75rem;
          }
          .p-5 {
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}