// src/components/TestimonialsCarousel.jsx
import React from "react";
import { Carousel, Card, Image, Row, Col } from "react-bootstrap";

const testimonials = [
  {
    text: `Grâce à NouMatch, j’ai rencontré quelqu’un qui partage vraiment mes valeurs.
           Les échanges sont naturels et je me suis sentie en confiance dès le début.`,
    name: "Clara",
    age: 27,
    location: "Port-au-Prince, Haïti",
    img: "https://randomuser.me/api/portraits/women/89.jpg",
  },
  {
    text: `J’ai testé plusieurs applis avant, mais NouMatch est différent.
           Les discussions sont simples, vraies, et sans pression.`,
    name: "Jean",
    age: 31,
    location: "Port-au-Prince, Haïti",
    img: "https://randomuser.me/api/portraits/men/30.jpg",
  },
  {
    text: `Ce que j’aime ici, c’est l’ambiance.
           On sent que les gens sont là pour de vraies connexions, pas juste pour passer le temps.`,
    name: "Sophie",
    age: 29,
    location: "Les Cayes, Haïti",
    img: "https://randomuser.me/api/portraits/women/92.jpg",
  },
];

// Helper to split array into slides of 3 cards
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function TestimonialsCarousel() {
  const slides = chunkArray(testimonials, 3); // 3 cards per slide

  return (
    <section id="testimonials" className="py-5 bg-light">
      <div className="container text-center">
        <h3 className="display-5 fw-bold mb-5">Ce que disent nos membres</h3>

        <Carousel indicators={true} controls={true} interval={5000} wrap={true} touch={true}>
          {slides.map((group, index) => (
            <Carousel.Item key={index}>
              <Row className="justify-content-center g-4">
                {group.map((t, i) => (
                  <Col lg={4} md={6} xs={12} key={i}>
                    <a href="#!" className="text-decoration-none">
                      <Card className="p-4 shadow-sm border-0 h-100 cursor-pointer">
                        <p className="text-muted mb-4">{t.text}</p>
                        <div className="d-flex align-items-center justify-content-center gap-3">
                          <Image
                            src={t.img}
                            alt={t.name}
                            roundedCircle
                            style={{ width: "60px", height: "60px", objectFit: "cover" }}
                          />
                          <div className="text-start">
                            <h6 className="fw-bold mb-0">{t.name}, {t.age} ans</h6>
                            <small className="text-muted">{t.location}</small>
                          </div>
                        </div>
                      </Card>
                    </a>
                  </Col>
                ))}
              </Row>
            </Carousel.Item>
          ))}
        </Carousel>
      </div>
    </section>
  );
}