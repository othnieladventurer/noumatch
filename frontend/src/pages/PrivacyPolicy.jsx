import React from "react";

export default function PrivacyPolicy() {
  return (
    <>
      {/* Force body to scroll – override any global overflow:hidden */}
      <style>{`
        html, body, #root {
          height: auto !important;
          min-height: 100vh !important;
          overflow: visible !important;
          overflow-y: auto !important;
          position: relative !important;
        }
        .overflow-hidden {
          overflow: visible !important;
        }
      `}</style>

      <div className="container py-5 mt-5">
        <div className="card shadow-sm border-0 rounded-4" style={{ overflow: "visible" }}>
          <div className="card-header bg-gradient-primary text-white p-4" style={{ background: "linear-gradient(135deg, #ff4d6d, #ff8fa3)" }}>
            <h1 className="display-5 fw-bold mb-0">Politique de confidentialité</h1>
            <p className="mb-0 mt-2 opacity-75">Dernière mise à jour : 22 mars 2026</p>
          </div>
          
          <div className="card-body p-4 p-md-5">
            {/* All content remains unchanged */}
            <p className="lead">
              Chez <strong className="text-danger">NouMatch</strong>, votre vie privée et la sécurité de vos données sont notre priorité. 
              Cette politique explique quelles informations nous collectons, comment nous les utilisons et vos droits en tant qu'utilisateur.
            </p>

            <div className="mt-4">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</span>
                Informations collectées
              </h2>
              <div className="ps-4">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item bg-transparent px-0"><i className="fas fa-user me-2 text-danger"></i> Informations personnelles : nom, prénom, email, date de naissance, genre, localisation</li>
                  <li className="list-group-item bg-transparent px-0"><i className="fas fa-image me-2 text-danger"></i> Contenu du profil : photos, bio, intérêts, préférences</li>
                  <li className="list-group-item bg-transparent px-0"><i className="fas fa-comments me-2 text-danger"></i> Activité sur l’application : messages, likes, matchs, interactions</li>
                  <li className="list-group-item bg-transparent px-0"><i className="fas fa-laptop-code me-2 text-danger"></i> Données techniques : adresse IP, type de navigateur, appareil utilisé</li>
                  <li className="list-group-item bg-transparent px-0"><i className="fas fa-map-marker-alt me-2 text-danger"></i> Données de localisation (avec votre consentement)</li>
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</span>
                Utilisation des informations
              </h2>
              <div className="ps-4">
                <ul className="list-unstyled">
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Pour créer et personnaliser votre expérience NouMatch</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Pour permettre la communication et les connexions entre utilisateurs</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Pour améliorer nos services et détecter les comportements inappropriés</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Pour vous envoyer des notifications, emails ou messages liés à votre compte</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Pour vous proposer des suggestions de profils pertinents dans votre région</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Pour analyser et optimiser les performances de l'application</li>
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>
                Partage et confidentialité
              </h2>
              <p>Nous ne vendons ni ne louons vos données à des tiers. Vos informations personnelles sont partagées uniquement :</p>
              <div className="ps-4">
                <ul className="list-unstyled">
                  <li className="mb-2"><i className="fas fa-users me-2 text-info"></i> Avec d’autres utilisateurs dans le cadre de l’application (ex. photos de profil, bio)</li>
                  <li className="mb-2"><i className="fas fa-gavel me-2 text-info"></i> Pour des raisons légales ou de sécurité si la loi l’exige</li>
                  <li className="mb-2"><i className="fas fa-cloud-upload-alt me-2 text-info"></i> Avec des prestataires techniques pour le stockage sécurisé et la livraison de nos services</li>
                  <li className="mb-2"><i className="fas fa-shield-alt me-2 text-info"></i> Pour la modération et la prévention des abus</li>
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</span>
                Sécurité des données
              </h2>
              <div className="bg-light p-4 rounded-3">
                <p className="mb-0">Nous utilisons des mesures techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, modification ou suppression, notamment :</p>
                <ul className="mt-3 mb-0">
                  <li><i className="fas fa-lock me-2 text-danger"></i> Chiffrement SSL/TLS pour toutes les transmissions de données</li>
                  <li><i className="fas fa-database me-2 text-danger"></i> Stockage sécurisé avec accès restreint</li>
                  <li><i className="fas fa-shield-virus me-2 text-danger"></i> Surveillance continue des activités suspectes</li>
                  <li><i className="fas fa-clock me-2 text-danger"></i> Authentification à deux facteurs (disponible prochainement)</li>
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>5</span>
                Cookies et technologies similaires
              </h2>
              <p>Nous utilisons des cookies pour analyser l’utilisation, améliorer l’expérience utilisateur et afficher des contenus pertinents. Vous pouvez gérer vos préférences dans votre navigateur.</p>
              <div className="row mt-3">
                <div className="col-md-4 mb-2">
                  <div className="border rounded-3 p-3 text-center">
                    <i className="fas fa-chart-line fa-2x text-danger mb-2"></i>
                    <h6>Cookies essentiels</h6>
                    <small className="text-muted">Nécessaires au fonctionnement</small>
                  </div>
                </div>
                <div className="col-md-4 mb-2">
                  <div className="border rounded-3 p-3 text-center">
                    <i className="fas fa-chart-bar fa-2x text-danger mb-2"></i>
                    <h6>Cookies analytiques</h6>
                    <small className="text-muted">Pour améliorer nos services</small>
                  </div>
                </div>
                <div className="col-md-4 mb-2">
                  <div className="border rounded-3 p-3 text-center">
                    <i className="fas fa-user-check fa-2x text-danger mb-2"></i>
                    <h6>Cookies de préférences</h6>
                    <small className="text-muted">Pour personnaliser votre expérience</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>6</span>
                Vos droits
              </h2>
              <div className="row">
                <div className="col-md-6">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-eye me-2 text-danger"></i> Droit d'accès à vos données</li>
                    <li className="mb-2"><i className="fas fa-edit me-2 text-danger"></i> Droit de rectification</li>
                    <li className="mb-2"><i className="fas fa-trash me-2 text-danger"></i> Droit à l'effacement (suppression)</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-download me-2 text-danger"></i> Droit à la portabilité des données</li>
                    <li className="mb-2"><i className="fas fa-ban me-2 text-danger"></i> Droit d'opposition au traitement</li>
                    <li className="mb-2"><i className="fas fa-tasks me-2 text-danger"></i> Droit à la limitation du traitement</li>
                  </ul>
                </div>
              </div>
              <div className="alert alert-info mt-3">
                <i className="fas fa-envelope me-2"></i>
                Pour exercer vos droits, contactez-nous à <strong>privacy@noumatch.com</strong>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>7</span>
                Conditions internationales
              </h2>
              <p>
                NouMatch est accessible depuis plusieurs pays. Nous respectons les lois locales sur la protection des données, y compris le RGPD pour les utilisateurs en Europe.
              </p>
            </div>

            <div className="mt-5">
              <h2 className="h3 mb-3 d-flex align-items-center">
                <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>8</span>
                Conservation des données
              </h2>
              <p>
                Nous conservons vos données aussi longtemps que votre compte est actif. Après suppression de votre compte, vos données sont supprimées dans un délai de 30 jours, sauf si nous sommes légalement tenus de les conserver plus longtemps.
              </p>
            </div>


            <div className="mt-5 pt-3 border-top">
                <h2 className="h3 mb-3">Contact</h2>
                <p>
                  Pour toute question concernant ces conditions, contactez-nous su notre page principale<br />
                 
                </p>
            </div>

            
          </div>
          
          <div className="card-footer bg-light p-3 text-center text-muted">
            <small>© 2026 NouMatch. Tous droits réservés.</small>
          </div>
        </div>
      </div>
    </>
  );
}


