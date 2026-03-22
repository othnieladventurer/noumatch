import React from "react";

export default function Footer() {
  return (
    <footer className="bg-dark text-light py-5">
      <div className="container">
        <div className="row gy-4">
          {/* About Section */}
          <div className="col-md-4">
            <h5 className="text-uppercase mb-3">NouMatch</h5>
            <p className="small text-light opacity-75">
              Des connexions sincères et respectueuses. Rencontrez des personnes authentiques près de chez vous.
            </p>
          </div>

          {/* Links Section */}
          <div className="col-md-4">
            <h5 className="text-uppercase mb-3">Liens utiles</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="/privacy" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                  Politique de confidentialité
                </a>
              </li>
              <li className="mb-2">
                <a href="/terms" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                  Conditions d'utilisation
                </a>
              </li>
              <li className="mb-2">
                <a href="#contact" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                  Contact
                </a>
              </li>
              <li>
                <a href="#faq" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media Section */}
          <div className="col-md-4">
            <h5 className="text-uppercase mb-3">Suivez-nous</h5>
            <div className="d-flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light fs-4"
                aria-label="Facebook"
              >
                <i className="fab fa-facebook-f"></i>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light fs-4"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light fs-4"
                aria-label="TikTok"
              >
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
            <p className="small mt-3 text-light opacity-75">
              Rejoignez notre communauté et restez informé des nouveautés.
            </p>
          </div>
        </div>

        <hr className="my-4 border-secondary" />

        <div className="text-center text-light opacity-75 small">
          © {new Date().getFullYear()} NouMatch — Des connexions sincères et respectueuses
        </div>
      </div>
    </footer>
  );
}

