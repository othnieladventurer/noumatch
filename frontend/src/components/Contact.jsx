import React, { useState } from "react";
import "../styles/public-redesign.css";

export default function Contact() {
  const [formData, setFormData] = useState({ email: "", subject: "", message: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Merci ! Votre message a été envoyé.");
    setFormData({ email: "", subject: "", message: "" });
  };

  return (
    <section id="contact" className="nm-section nm-section-cream">
      <div className="container">

        {/* Section header */}
        <div className="text-center mb-5" data-aos="fade-up">
          <span className="nm-section-tag">Contact</span>
          <h2 className="nm-section-title">Contactez-nous</h2>
          <p className="nm-section-desc">
            Vous avez des questions ou des suggestions ?<br className="d-none d-md-inline" />
            Envoyez-nous un message et nous vous répondrons rapidement.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="row g-4 g-lg-5 align-items-start justify-content-center">

          {/* Left: contact info */}
          <div className="col-12 col-lg-4" data-aos="fade-right">
            <div className="nm-contact-info-box">
              <div className="nm-contact-info-item">
                <div className="nm-contact-info-icon">✉</div>
                <div>
                  <p className="nm-contact-info-label">Email</p>
                  <p className="nm-contact-info-value">support@noumatch.com</p>
                </div>
              </div>
              <div className="nm-contact-info-item">
                <div className="nm-contact-info-icon">📱</div>
                <div>
                  <p className="nm-contact-info-label">Réseaux sociaux</p>
                  <p className="nm-contact-info-value">Instagram · TikTok · Facebook</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="col-12 col-lg-7" data-aos="fade-left">
            <div className="nm-contact-form-card">
              <form onSubmit={handleSubmit}>
                <div className="nm-form-field">
                  <label className="nm-label">Adresse email</label>
                  <input
                    type="email"
                    className="nm-input"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre.email@example.com"
                    required
                  />
                </div>

                <div className="nm-form-field">
                  <label className="nm-label">Sujet</label>
                  <input
                    type="text"
                    className="nm-input"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Sujet de votre message"
                    required
                  />
                </div>

                <div className="nm-form-field">
                  <label className="nm-label">Message</label>
                  <textarea
                    className="nm-input"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Votre message…"
                    required
                    style={{ resize: "vertical" }}
                  />
                </div>

                <button type="submit" className="nm-btn nm-btn-primary" style={{ width: "100%" }}>
                  Envoyer le message
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
