import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import profileImg from "../assets/profile.png";
import chattingImg from "../assets/chatting.png";
import filteringImg from "../assets/filtering.png";

const FEATURES = [
  {
    img: chattingImg,
    alt: "Conversations naturelles",
    title: "Des échanges simples",
    desc: "Des conversations qui commencent naturellement, sans phrases toutes faites ni attentes irréalistes.",
  },
  {
    img: "https://img.freepik.com/free-vector/dating-app-concept-with-man-woman-match_23-2148531130.jpg?semt=ais_hybrid&w=740&q=80",
    alt: "Profils qui te parlent",
    title: "Des profils qui te parlent",
    desc: "Prenez le temps de découvrir des personnes qui partagent vos valeurs et votre énergie.",
  },
  {
    img: filteringImg,
    alt: "Authenticité",
    title: "Sois simplement toi",
    desc: "Pas besoin d'en faire trop. Ici, l'authenticité compte plus que la perfection. Les vraies connexions commencent quand on reste soi-même.",
  },
];

const FeaturesSection = () => {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, mirror: false });
  }, []);

  return (
    <section id="noumatchesprit" className="py-5" style={{ background: "#faf5ef" }}>
      <div className="container">
        <div className="text-center mb-5" data-aos="fade-up">
          <span
            style={{
              display: "inline-block",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#dc2626",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
            }}
          >
            L'esprit NouMatch
          </span>
          <h3
            style={{
              fontWeight: 800,
              fontSize: "clamp(1.85rem, 3.5vw, 2.6rem)",
              color: "#0f172a",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: "0 0 0.75rem",
            }}
          >
            L'esprit NouMatch
          </h3>
          <p style={{ color: "#64748b", maxWidth: "580px", margin: "0 auto", lineHeight: 1.7, fontSize: "1rem" }}>
            Ici, on prend le temps. On discute, on se découvre, et on laisse les connexions se créer naturellement,
            sans pression ni faux-semblants.
          </p>
        </div>

        <div className="row g-4">
          {FEATURES.map((f, i) => (
            <div className="col-md-4" key={i} data-aos="fade-up" data-aos-delay={i * 100}>
              <div className="nm-feature-card">
                <img src={f.img} alt={f.alt} className="nm-feature-card-img" />
                <div className="nm-feature-card-body">
                  <h5>{f.title}</h5>
                  <p>{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
