import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import "../styles/guide-page.css";

export default function NotFound() {
  return (
    <div className="nm-guide">
      <section className="nm-notfound">
        <div className="nm-guide-container">
          <div className="nm-notfound-inner">
            <span className="nm-notfound-code">Erreur 404</span>
            <h1>Cette page n'existe pas</h1>
            <p>
              Le lien que vous avez suivi est peut-être ancien, ou l'adresse
              contient une erreur. Vous pouvez revenir à l'accueil, parcourir
              nos guides ou créer un profil.
            </p>

            <div className="nm-notfound-actions">
              <Link to="/" className="nm-guide-btn">
                Retour à l'accueil
              </Link>
              <Link to="/guides" className="btn btn-outline-dark">
                Voir les guides
              </Link>
              <Link to="/register" className="btn btn-outline-dark">
                Créer un profil <FaArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="nm-notfound-links">
              <span>Pages les plus consultées</span>
              <ul>
                <li>
                  <Link to="/">Accueil</Link>
                </li>
                <li>
                  <Link to="/rencontre-haiti">Rencontres en Haïti</Link>
                </li>
                <li>
                  <Link to="/rencontres-port-au-prince">Rencontrer à Port-au-Prince</Link>
                </li>
                <li>
                  <Link to="/securite-rencontres-en-ligne">Sécurité en ligne</Link>
                </li>
                <li>
                  <Link to="/application-rencontre-haiti">Choisir une application</Link>
                </li>
                <li>
                  <Link to="/waitlist">Liste d'attente</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
