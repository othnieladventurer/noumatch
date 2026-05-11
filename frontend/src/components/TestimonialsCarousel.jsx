import React from "react";

const testimonials = [
  {
    text: "Grâce à NouMatch, j'ai rencontré quelqu'un qui partage vraiment mes valeurs. Les échanges sont naturels et je me suis sentie en confiance dès le début.",
    name: "Clara",
    age: 27,
    location: "Port-au-Prince, Haïti",
    img: "https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
  },
  {
    text: "J'ai testé plusieurs applis avant, mais NouMatch est différent. Les discussions sont simples, vraies, et sans pression.",
    name: "Jean",
    age: 31,
    location: "Port-au-Prince, Haïti",
    img: "https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
  },
  {
    text: "Ce que j'aime ici, c'est l'ambiance. On sent que les gens sont là pour de vraies connexions, pas juste pour passer le temps.",
    name: "Sophie",
    age: 29,
    location: "Les Cayes, Haïti",
    img: "https://images.pexels.com/photos/3771836/pexels-photo-3771836.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
  },
];

export default function TestimonialsCarousel() {
  return (
    <section id="testimonials" className="py-5" style={{ background: "#faf5ef" }}>
      <div className="container">
        <div className="text-center mb-5">
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
            Témoignages
          </span>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(1.85rem, 3.5vw, 2.6rem)",
              color: "#0f172a",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Ce que disent nos membres
          </h2>
        </div>

        <div className="row g-4">
          {testimonials.map((t, i) => (
            <div className="col-md-4" key={i}>
              <div className="nm-testimonial-card">
                <span className="nm-testimonial-quote-mark">"</span>
                <p className="nm-testimonial-text">{t.text}</p>
                <div className="nm-testimonial-author">
                  <img src={t.img} alt={t.name} />
                  <div>
                    <span className="nm-testimonial-name">{t.name}, {t.age} ans</span>
                    <span className="nm-testimonial-loc">{t.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
