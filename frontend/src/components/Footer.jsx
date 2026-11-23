import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowUp, FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import "../styles/footer-redesign.css";

export default function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 320);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {showScrollTop && (
        <button onClick={scrollToTop} className="nm-scroll-top" aria-label="Retour en haut">
          <FaArrowUp />
        </button>
      )}

      <footer className="nm-footer">
        <div className="container">
          <div className="nm-footer-cta">
            <div>
              <h4>L'application mobile Noumatch arrive bientôt</h4>
              <p>Téléchargez-la dès sa sortie sur iOS et Android.</p>
            </div>
            <div className="nm-footer-cta-actions">
              <Link to="/application-mobile" className="btn btn-danger">Télécharger l'application</Link>
              <Link to="/waitlist" className="btn btn-outline-light">Liste d'attente</Link>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-lg-4">
              <h5>NouMatch</h5>
              <p className="nm-footer-muted">
                Des connexions sinceres et respectueuses. Une plateforme moderne
                pour transformer les matchs en vraies rencontres.
              </p>
            </div>

            <div className="col-lg-4">
              <h6>Navigation</h6>
              <ul className="nm-footer-list">
                <li><Link to="/application-mobile">L'application mobile</Link></li>
                <li><Link to="/guides">Guides de rencontres</Link></li>
                <li><Link to="/rencontres-port-au-prince">Rencontrer a Port-au-Prince</Link></li>
                <li><Link to="/securite-rencontres-en-ligne">Securite en ligne</Link></li>
                <li><Link to="/privacy">Politique de confidentialite</Link></li>
                <li><Link to="/terms">Conditions d'utilisation</Link></li>
                <li><a href="#contact">Contact</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>

            <div className="col-lg-4">
              <h6>Suivez-nous</h6>
              <div className="nm-footer-socials">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <FaFacebookF />
                </a>
                <a
                  href="https://www.instagram.com/noumatchhaiti?igsh=eDM0eHp4aDhwcDFh"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <FaInstagram />
                </a>
                <a
                  href="https://www.tiktok.com/@noumatch?_r=1&_t=ZS-959uNIGwKGo"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <FaTiktok />
                </a>
              </div>
              <p className="nm-footer-muted mt-3 mb-0">
                Rejoignez notre communaute et restez informe des nouveautes.
              </p>
            </div>
          </div>

          <div className="nm-footer-bottom">
            © {new Date().getFullYear()} NouMatch - Des connexions sinceres et respectueuses
          </div>
        </div>
      </footer>
    </>
  );
}
