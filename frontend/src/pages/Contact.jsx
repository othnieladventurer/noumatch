import React, { useState, useEffect } from "react";
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaPaperPlane, FaCheckCircle, FaClock, FaShieldAlt, FaHeart } from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    setTimeout(() => {
      setSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setLoading(false);
      setTimeout(() => setSuccess(false), 5000);
    }, 1000);
  };

  return (
    <div style={{ paddingTop: "60px" }}>
      {/* Hero Section */}
      <section
        className="position-relative d-flex align-items-center text-white text-center"
        style={{
          minHeight: "50vh",
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
            <FaHeart className="me-2" />
            On est là pour vous
          </div>
          <h1 className="display-4 fw-bold mb-4">
            Contactez notre équipe
          </h1>
          <p className="lead mb-0 mx-auto" style={{ maxWidth: "600px" }}>
            Une question ? Un problème ? Une suggestion ? Notre équipe est à votre écoute 24/7
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-5">
        <div className="container px-3">
          <div className="row g-4">
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="100">
              <div className="card border-0 shadow-lg h-100 text-center p-4 rounded-4 hover-lift">
                <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                  <FaEnvelope size={30} className="text-danger" />
                </div>
                <h5 className="fw-bold mb-2">Email</h5>
                <p className="text-muted mb-1">support@noumatch.com</p>
                <p className="text-muted mb-0">commercial@noumatch.com</p>
                <small className="text-muted mt-2">Réponse sous 24-48h</small>
              </div>
            </div>
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
              <div className="card border-0 shadow-lg h-100 text-center p-4 rounded-4 hover-lift">
                <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                  <FaPhone size={30} className="text-danger" />
                </div>
                <h5 className="fw-bold mb-2">Téléphone</h5>
                <p className="text-muted mb-1">+509 1234 5678</p>
                <p className="text-muted mb-0">+509 8765 4321</p>
                <small className="text-muted mt-2">Lun-Ven, 9h-18h</small>
              </div>
            </div>
            <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
              <div className="card border-0 shadow-lg h-100 text-center p-4 rounded-4 hover-lift">
                <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                  <FaMapMarkerAlt size={30} className="text-danger" />
                </div>
                <h5 className="fw-bold mb-2">Adresse</h5>
                <p className="text-muted mb-1">Port-au-Prince, Haïti</p>
                <p className="text-muted mb-0">Delmas 31, #12</p>
                <small className="text-muted mt-2">Nous contacter pour plus d'infos</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-5 bg-light">
        <div className="container px-3">
          <div className="row g-5">
            {/* Form Column */}
            <div className="col-lg-6" data-aos="fade-right">
              <div className="bg-white rounded-4 shadow-lg p-5">
                <h2 className="fw-bold mb-3">Envoyez-nous un message</h2>
                <p className="text-muted mb-4">
                  Remplissez le formulaire ci-dessous et notre équipe vous répondra dans les plus brefs délais.
                </p>
                
                {success && (
                  <div className="alert alert-success rounded-4 d-flex align-items-center mb-4">
                    <FaCheckCircle className="me-2 fs-5" />
                    <div>Message envoyé avec succès ! Nous vous répondrons rapidement.</div>
                  </div>
                )}
                
                {error && (
                  <div className="alert alert-danger rounded-4 mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nom complet</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control form-control-lg rounded-3"
                      placeholder="Jean Dupont"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-control form-control-lg rounded-3"
                      placeholder="jean@exemple.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Sujet</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="form-control form-control-lg rounded-3"
                      placeholder="Question sur mon compte"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      className="form-control form-control-lg rounded-3"
                      rows="5"
                      placeholder="Décrivez votre demande..."
                      required
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-danger btn-lg px-5 rounded-pill w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="me-2" />
                        Envoyer le message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Info Column */}
            <div className="col-lg-6" data-aos="fade-left">
              <div className="bg-white rounded-4 shadow-lg p-5 h-100">
                <h3 className="fw-bold mb-4">Informations utiles</h3>
                
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: "40px", height: "40px" }}>
                      <FaClock className="text-danger" />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0">Horaires d'ouverture</h6>
                      <small className="text-muted">Lundi - Vendredi: 9h00 - 18h00</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: "40px", height: "40px" }}>
                      <FaShieldAlt className="text-danger" />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0">Support prioritaire</h6>
                      <small className="text-muted">Les utilisateurs premium ont la priorité</small>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                <h4 className="fw-bold mb-3">📋 Avant de nous écrire</h4>
                <ul className="text-muted list-unstyled">
                  <li className="mb-2">✓ Consultez notre <a href="/#/faq" className="text-danger text-decoration-none">FAQ</a> pour des réponses rapides</li>
                  <li className="mb-2">✓ Soyez précis dans votre demande pour une réponse plus rapide</li>
                  <li className="mb-2">✓ Incluez votre identifiant si vous avez un problème de compte</li>
                  <li className="mb-2">✓ Vérifiez votre dossier spam si vous n'avez pas reçu de réponse</li>
                </ul>

                <hr className="my-4" />

                <h4 className="fw-bold mb-3">🤝 Suivez-nous</h4>
                <div className="d-flex gap-3">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline-danger rounded-circle" style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="https://www.instagram.com/noumatchhaiti" target="_blank" rel="noopener noreferrer" className="btn btn-outline-danger rounded-circle" style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="https://www.tiktok.com/@noumatch" target="_blank" rel="noopener noreferrer" className="btn btn-outline-danger rounded-circle" style={{ width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="fab fa-tiktok"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* CTA Section */}
      <section className="py-5 bg-danger text-white">
        <div className="container px-3 text-center" data-aos="fade-up">
          <h2 className="fw-bold mb-3">Prêt à rejoindre l'aventure ?</h2>
          <p className="mb-4 opacity-75">Des milliers de personnes ont déjà trouvé des connexions sincères sur NouMatch</p>
          <a href="/#/register" className="btn btn-light btn-lg px-5 rounded-pill text-danger fw-bold">
            Créer mon compte gratuitement
          </a>
        </div>
      </section>

      <style>{`
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
        }
        @media (max-width: 768px) {
          .display-4 {
            font-size: 2rem;
          }
          .p-5 {
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}