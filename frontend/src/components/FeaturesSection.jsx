// FeaturesSection.jsx
import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css"; // Import AOS CSS

import profileImg from "../assets/profile.png";
import chattingImg from "../assets/chatting.png";
import filteringImg from "../assets/filtering.png";

const FeaturesSection = () => {
  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 800, // animation duration in ms
      once: true,    // animate only once
      mirror: false, // whether elements should animate out while scrolling past them
    });
  }, []);

  return (
    <section id="noumatchesprit" className="py-5 bg-white">
      <div className="container">

        {/* Section intro */}
        <div className="text-center mb-5" data-aos="fade-up">
          <h3 className="fw-bold mb-3">L’esprit NouMatch</h3>
          <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
            Ici, on prend le temps. On discute, on se découvre, et on laisse les connexions se créer naturellement, sans pression ni faux-semblants.
          </p>
        </div>

        {/* Cards */}
        <div className="row g-4">

          {/* Card 1 */}
          <div className="col-md-4" data-aos="fade-up" data-aos-delay="100">
            <div className="card h-100 shadow-sm d-flex flex-column">
              <img
                src={chattingImg}
                alt="Conversations naturelles"
                className="card-img-top"
                style={{ height: "180px", objectFit: "cover" }}
              />
              <div className="card-body text-center d-flex flex-column">
                <h5 className="fw-bold">Des échanges simples</h5>
                <p className="text-muted flex-grow-1">
                  Des conversations qui commencent naturellement, sans phrases toutes faites ni attentes irréalistes.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
            <div className="card h-100 shadow-sm d-flex flex-column">
              <img
                src="https://img.freepik.com/free-vector/dating-app-concept-with-man-woman-match_23-2148531130.jpg?semt=ais_hybrid&w=740&q=80"
                alt="Profils qui te parlent"
                className="card-img-top"
                style={{ height: "180px", objectFit: "cover" }}
              />
              <div className="card-body text-center d-flex flex-column">
                <h5 className="fw-bold">Des profils qui te parlent</h5>
                <p className="text-muted flex-grow-1">
                  Prenez le temps de découvrir des personnes qui partagent vos valeurs et votre énergie.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
            <div className="card h-100 shadow-sm d-flex flex-column">
              <img
                src={filteringImg}
                alt="Authenticité"
                className="card-img-top"
                style={{ height: "180px", objectFit: "cover" }}
              />
              <div className="card-body text-center d-flex flex-column">
                <h5 className="fw-bold">Sois simplement toi</h5>
                <p className="text-muted flex-grow-1">
                  Pas besoin d’en faire trop. Ici, l’authenticité compte plus que la perfection.
                  Les vraies connexions commencent quand on reste soi-même.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;