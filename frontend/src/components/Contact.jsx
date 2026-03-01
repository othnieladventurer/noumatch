// src/components/Contact.jsx
import React, { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Contact form submitted:", formData);
    alert("Merci ! Votre message a été envoyé.");
    setFormData({ email: "", subject: "", message: "" });
  };

  return (
    <section
      id="contact"
      className="py-5"
      style={{ backgroundColor: "#f3e8ff" }} // light purple
    >
      <div className="container">
        <div className="text-center mb-5" data-aos="fade-up">
          <h2 className="fw-bold">Contactez-nous</h2>
          <p className="text-muted mx-auto" style={{ maxWidth: "600px" }}>
            Vous avez des questions ou des suggestions ? Envoyez-nous un message et nous vous répondrons rapidement.
          </p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-6" data-aos="fade-up" data-aos-delay="100">
            <div className="bg-white rounded-4 shadow-lg p-5">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="form-label fw-semibold">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre.email@example.com"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="subject" className="form-label fw-semibold">
                    Sujet
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Sujet de votre message"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="message" className="form-label fw-semibold">
                    Message
                  </label>
                  <textarea
                    className="form-control form-control-lg"
                    id="message"
                    name="message"
                    rows="6"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Votre message..."
                    required
                  ></textarea>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    className="btn btn-danger btn-lg px-5"
                    style={{ transition: "0.3s" }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}