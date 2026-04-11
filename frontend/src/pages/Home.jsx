import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaUser, FaLock } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import FeaturesSection from "../components/FeaturesSection";
import TestimonialsCarousel from "../components/TestimonialsCarousel";
import Faq from "../components/Faq";
import Contact from "../components/Contact";

import AOS from "aos";
import "aos/dist/aos.css";

import createProfile from "../assets/createprofile.png";
import verifyEmail from "../assets/emailverify.png";
import swipeImage from "../assets/nmswipe.png";
import conversationImage from "../assets/conversation.png";

export default function Home() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
  }, []);

  return (
    <>
      {/* Force body to scroll – override any global overflow:hidden */}
      <style>{`
        html, body, #root {
          height: auto !important;
          min-height: 100vh !important;
          overflow: visible !important;
          overflow-y: auto !important;
          position: relative !important;
        }
        .overflow-hidden {
          overflow: visible !important;
        }
      `}</style>

      <div className="overflow-hidden">
        {/* HERO SECTION */}
        <section 
          className="d-flex align-items-center text-white text-center"
          data-aos="fade-down"
          style={{
            minHeight: "90vh",
            backgroundImage: "url('https://images.pexels.com/photos/6579000/pexels-photo-6579000.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          <div className="position-absolute w-100 h-100 bg-dark opacity-50"></div>
          <div className="container position-relative px-3">
            <h1 className="display-5 fw-bold">
              NouMatch : Rencontrez des hommes et femmes<br />
              
            </h1>
            <p className="lead mt-3 mb-4">
              Un espace pour trouver des rencontres vraies, fun et sincères!
            </p>
            <Link to="/login" className="btn btn-danger btn-lg px-4">Créer Mon Compte</Link>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section id="who" data-aos="fade-up" className="py-5 bg-light">
          <div className="container px-3">
            <div className="row align-items-center g-4">
              <div className="col-lg-6">
                <h2 className="fw-bold mb-3">NouMatch</h2>
                <p>NouMatch crée un espace où les rencontres se font avec sincérité et respect.</p>
                <p>Chaque rencontre compte et chaque échange peut devenir une véritable connexion.</p>
                <p>Notre mission : rendre les rencontres en ligne authentiques, humaines et enrichissantes.</p>
              </div>
              <div className="col-lg-6">
                <img
                  src="https://img.freepik.com/premium-photo/happy-love-relax-couple-walking-city-date-together-their-getaway-break-summer-travel-smile-with-young-black-man-woman-holding-hands-street-their-vacation-trip_590464-81239.jpg?w=360"
                  alt="Deux amis discutant"
                  className="img-fluid rounded shadow w-100"
                  style={{ maxHeight: "400px", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-5" style={{ backgroundColor: "#f3e8ff" }}>
          <div className="container px-3">
            {/* Section Title */}
            <div className="text-center mb-5" data-aos="fade-up">
              <h2 className="fw-bold display-6">Comment ça marche</h2>
              <p className="text-muted mx-auto" style={{ maxWidth: "650px" }}>
                Découvrez les étapes simples qui rendent l'expérience NouMatch fluide, sécurisée et authentique.
              </p>
            </div>

            {/* Step 1 - Créer son profil */}
            <div className="row align-items-center mb-4 g-4">
              <div className="col-lg-6 d-flex justify-content-center" data-aos="fade-right">
                <img
                  src={createProfile}
                  alt="Créer son profil"
                  className="img-fluid rounded-4 shadow"
                  style={{ width: "100%", maxHeight: "350px", objectFit: "cover" }}
                />
              </div>
              <div className="col-lg-6 d-flex" data-aos="fade-left">
                <div className="bg-white rounded-4 shadow p-4 w-100 d-flex flex-column justify-content-center" style={{ minHeight: "350px" }}>
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: "50px", height: "50px" }}>
                    <span className="text-white fw-bold fs-5">1</span>
                  </div>
                  <h4 className="fw-bold">Créez votre profil</h4>
                  <p className="text-muted mb-0">
                    Renseignez vos informations, ajoutez vos photos et partagez vos centres d'intérêt. Un profil complet attire des personnes qui vous correspondent vraiment.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 - Vérifier son profil */}
            <div className="row align-items-center mb-4 g-4 flex-lg-row-reverse">
              <div className="col-lg-6 d-flex justify-content-center" data-aos="fade-left">
                <img
                  src={verifyEmail}
                  alt="Vérifier son profil"
                  className="img-fluid rounded-4 shadow"
                  style={{ width: "100%", maxHeight: "350px", objectFit: "cover" }}
                />
              </div>
              <div className="col-lg-6 d-flex" data-aos="fade-right">
                <div className="bg-white rounded-4 shadow p-4 w-100 d-flex flex-column justify-content-center" style={{ minHeight: "350px" }}>
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: "50px", height: "50px" }}>
                    <span className="text-white fw-bold fs-5">2</span>
                  </div>
                  <h4 className="fw-bold">Vérifiez votre profil</h4>
                  <p className="text-muted mb-0">
                    Confirmez votre email pour garantir l'authenticité de votre profil. Une communauté vérifiée, c'est plus de confiance et de rencontres sincères.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 - Swiper, liker, matcher */}
            <div className="row align-items-center mb-4 g-4">
              <div className="col-lg-6 d-flex justify-content-center" data-aos="fade-right">
                <img
                  src={swipeImage}
                  alt="Swiper et liker"
                  className="img-fluid rounded-4 shadow"
                  style={{ width: "100%", maxHeight: "350px", objectFit: "cover" }}
                />
              </div>
              <div className="col-lg-6 d-flex" data-aos="fade-left">
                <div className="bg-white rounded-4 shadow p-4 w-100 d-flex flex-column justify-content-center" style={{ minHeight: "350px" }}>
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: "50px", height: "50px" }}>
                    <span className="text-white fw-bold fs-5">3</span>
                  </div>
                  <h4 className="fw-bold">Swipez, likez et matchez</h4>
                  <p className="text-muted mb-0">
                    Parcourez les profils près de vous, likez ceux qui vous intéressent. Quand vous matchez, c'est le début d'une belle histoire !
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 - Commencer la conversation */}
            <div className="row align-items-center g-4 flex-lg-row-reverse">
              <div className="col-lg-6 d-flex justify-content-center" data-aos="fade-left">
                <img
                  src={conversationImage}
                  alt="Commencer la conversation"
                  className="img-fluid rounded-4 shadow"
                  style={{ width: "100%", maxHeight: "350px", objectFit: "cover" }}
                />
              </div>
              <div className="col-lg-6 d-flex" data-aos="fade-right">
                <div className="bg-white rounded-4 shadow p-4 w-100 d-flex flex-column justify-content-center" style={{ minHeight: "350px" }}>
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: "50px", height: "50px" }}>
                    <span className="text-white fw-bold fs-5">4</span>
                  </div>
                  <h4 className="fw-bold">Commencez la conversation</h4>
                  <p className="text-muted mb-0">
                    Une fois le match confirmé, lancez-vous ! Discutez, apprenez à vous connaître et laissez la magie opérer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NOUMATCH SPIRIT – THIS COMPONENT NOW HAS AOS ON ITS TITLE & PARAGRAPH */}
        <FeaturesSection />

        {/* ENGAGE IN PERSON */}
        <section className="py-5 bg-light" data-aos="fade-right">
          <div className="container px-3">
            <div className="row align-items-center g-4">
              <div className="col-lg-6 d-flex justify-content-center">
                <img
                  src="https://img.freepik.com/premium-photo/love-phone-social-media-with-black-couple-sofa-home-living-room-together-relax-app-happy-smile-with-man-woman-apartment-streaming-with-bonding-online-shopping_590464-495126.jpg?semt=ais_hybrid&w=740&q=80"
                  alt="Rencontres en personne"
                  className="img-fluid rounded-4 shadow"
                  style={{ maxHeight: "400px", objectFit: "cover", width: "100%" }}
                />
              </div>
              <div className="col-lg-6">
                <h3 className="fw-bold mb-3">Passez du virtuel au réel</h3>
                <p className="text-muted mb-4">
                  Rencontrez des personnes qui partagent vos centres d'intérêt, vos valeurs et votre énergie. Discutez, riez, créez des liens et laissez la rencontre se faire naturellement.
                </p>
                <Link to="/login" className="btn btn-danger btn-lg px-4">Engage la conversation</Link>
              </div>
            </div>
          </div>
        </section>

        {/* LOGIN CTA */}
        <section
          className="py-5 text-white position-relative d-flex align-items-center"
          data-aos="fade-up"
          style={{
            minHeight: "60vh",
            backgroundImage: "url('https://img.freepik.com/free-photo/romantic-black-couple-sitting-restaurant-wearing-elegant-clothes_1157-51941.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="position-absolute w-100 h-100" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}></div>
          <div className="container position-relative text-center px-3">
            <h3 className="fw-bold display-6 mb-3">Bienvenue sur NouMatch</h3>
            <p className="mb-4 text-light mx-auto" style={{ maxWidth: "700px" }}>
              Connectez-vous pour continuer votre parcours vers des connexions authentiques et significatives. Accédez à votre profil et découvrez vos matchs dès maintenant.
            </p>
            <Link to="/login" className="btn btn-light btn-lg text-danger fw-semibold px-4">Se connecter</Link>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <TestimonialsCarousel />

        {/* FAQ */}
        <Faq />

        {/* CONTACT */}
        <Contact />
      </div>
    </>
  );
}