import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaArrowUp } from "react-icons/fa";

export default function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <>
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="position-fixed bottom-0 end-0 m-4 btn btn-danger rounded-circle shadow-lg"
          style={{
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            transition: "all 0.3s ease",
            border: "none"
          }}
          aria-label="Retour en haut"
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-5px)";
            e.target.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
          }}
        >
          <FaArrowUp size={20} />
        </button>
      )}

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
                  <Link to="/privacy" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                    Politique de confidentialité
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/terms" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                    Conditions d'utilisation
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/contact" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-light text-decoration-none opacity-75 hover-opacity-100">
                    FAQ
                  </Link>
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
                  href="https://www.instagram.com/noumatchhaiti?igsh=eDM0eHp4aDhwcDFh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-light fs-4"
                  aria-label="Instagram"
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a
                  href="https://www.tiktok.com/@noumatch?_r=1&_t=ZS-959uNIGwKGo"
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

      <style>
        {`
          .hover-opacity-100:hover {
            opacity: 1 !important;
          }
        `}
      </style>
    </>
  );
}