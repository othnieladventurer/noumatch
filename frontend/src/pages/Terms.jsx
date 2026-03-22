import React from "react";

export default function Terms() {
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

      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: "#f5f7fb"
        // Removed: overflowY: "auto", height: "100%"
      }}>
        <div className="container py-5 mt-5">
          <div className="mb-4">
            <div className="p-4" style={{ background: "linear-gradient(135deg, #ff4d6d, #ff8fa3)", borderRadius: "20px 20px 0 0" }}>
              <h1 className="display-5 fw-bold mb-0 text-white">Conditions d'utilisation</h1>
              <p className="mb-0 mt-2 text-white opacity-75">Dernière mise à jour : 22 mars 2026</p>
            </div>
            
            <div className="p-4 p-md-5 bg-white shadow-sm" style={{ borderRadius: "0 0 20px 20px" }}>
              <p className="lead">
                Les présentes conditions régissent votre utilisation de <strong className="text-danger">NouMatch</strong>, une application de rencontres pour rencontrer des personnes de manière authentique et respectueuse. 
                En utilisant l'application, vous acceptez ces conditions.
              </p>

              <div className="mt-4">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</span>
                  Éligibilité
                </h2>
                <div className="ps-4">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Vous devez avoir au moins <strong>18 ans</strong> pour créer un compte</li>
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Vous devez fournir des informations exactes et à jour</li>
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Une seule personne par compte (pas de comptes partagés)</li>
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Les casiers judiciaires ou antécédents violents entraînent une interdiction immédiate</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</span>
                  Création et responsabilité du compte
                </h2>
                <div className="ps-4">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-lock me-2 text-danger"></i> Vous êtes responsable de la confidentialité de vos identifiants</li>
                    <li className="mb-2"><i className="fas fa-user-check me-2 text-danger"></i> Toute activité sur votre compte est de votre responsabilité</li>
                    <li className="mb-2"><i className="fas fa-ban me-2 text-danger"></i> Nous nous réservons le droit de suspendre ou supprimer un compte pour non-respect des conditions</li>
                    <li className="mb-2"><i className="fas fa-envelope me-2 text-danger"></i> Vous devez signaler immédiatement toute utilisation non autorisée de votre compte</li>
                    <li className="mb-2"><i className="fas fa-id-card me-2 text-danger"></i> Un seul compte par personne (les comptes multiples sont interdits)</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>
                  Contenu et comportement
                </h2>
                <p>Vous vous engagez à :</p>
                <div className="ps-4">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-ban text-danger me-2"></i> Ne pas poster de contenu offensant, discriminatoire ou illégal</li>
                    <li className="mb-2"><i className="fas fa-heart text-danger me-2"></i> Respecter les autres utilisateurs et leurs préférences</li>
                    <li className="mb-2"><i className="fas fa-shield-alt text-danger me-2"></i> Ne pas utiliser l'application pour harceler ou tromper quelqu'un</li>
                    <li className="mb-2"><i className="fas fa-camera text-danger me-2"></i> Publier uniquement des photos récentes et authentiques</li>
                    <li className="mb-2"><i className="fas fa-comment-dots text-danger me-2"></i> Maintenir des conversations respectueuses et bienveillantes</li>
                    <li className="mb-2"><i className="fas fa-flag text-danger me-2"></i> Signaler tout comportement inapproprié ou suspect</li>
                  </ul>
                </div>
                <div className="bg-light p-3 rounded-3 mt-3">
                  <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                  <strong>Interdictions strictes :</strong> Propos haineux, harcèlement, sollicitation commerciale, usurpation d'identité, contenus sexuellement explicites, promotion de produits illégaux.
                </div>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</span>
                  Propriété intellectuelle
                </h2>
                <div className="ps-4">
                  <p>Vous conservez la propriété de votre contenu, mais en utilisant NouMatch, vous nous accordez :</p>
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Une licence non exclusive pour afficher et utiliser votre contenu dans le cadre de l'application</li>
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> Le droit de modérer, adapter ou supprimer tout contenu violant nos conditions</li>
                    <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i> La possibilité d'utiliser des images anonymisées pour des campagnes promotionnelles</li>
                  </ul>
                  <p className="mt-2">Tous les logos, noms et éléments graphiques de NouMatch sont protégés par les droits d'auteur.</p>
                </div>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>5</span>
                  Notifications et communication
                </h2>
                <p>En utilisant l'application, vous acceptez de recevoir :</p>
                <div className="row mt-3">
                  <div className="col-md-6 mb-2">
                    <div className="border rounded-3 p-3">
                      <i className="fas fa-bell text-danger me-2"></i>
                      <strong>Notifications push</strong>
                      <p className="mb-0 small text-muted">Matchs, messages et interactions</p>
                    </div>
                  </div>
                  <div className="col-md-6 mb-2">
                    <div className="border rounded-3 p-3">
                      <i className="fas fa-envelope text-danger me-2"></i>
                      <strong>Emails transactionnels</strong>
                      <p className="mb-0 small text-muted">Confirmations, alertes de sécurité</p>
                    </div>
                  </div>
                </div>
                <p className="mt-3">Vous pouvez gérer vos préférences de notification dans les paramètres de l'application ou de votre appareil.</p>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>6</span>
                  Modifications et suspension
                </h2>
                <div className="ps-4">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-edit me-2 text-info"></i> Nous pouvons mettre à jour les conditions à tout moment</li>
                    <li className="mb-2"><i className="fas fa-envelope me-2 text-info"></i> Les utilisateurs seront informés des modifications par email ou notification</li>
                    <li className="mb-2"><i className="fas fa-pause me-2 text-info"></i> Nous pouvons suspendre temporairement l'application pour maintenance ou raisons de sécurité</li>
                    <li className="mb-2"><i className="fas fa-trash me-2 text-info"></i> Les comptes inactifs pendant plus de 12 mois peuvent être supprimés</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>7</span>
                  Abonnements et paiements
                </h2>
                <div className="bg-light p-3 rounded-3">
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2"><i className="fas fa-gem text-warning me-2"></i> <strong>Formule Premium :</strong> 19,99€/mois (accès illimité aux likes, voir qui vous aime)</li>
                    <li className="mb-2"><i className="fas fa-crown text-warning me-2"></i> <strong>Formule God Mode :</strong> 49,99€/mois (boost de profil, lecture de messages, support prioritaire)</li>
                    <li><i className="fas fa-credit-card text-warning me-2"></i> Les abonnements sont automatiquement renouvelés sauf annulation 24h avant la fin de la période</li>
                  </ul>
                </div>
                <p className="mt-3">Les remboursements sont traités conformément à la politique de l'App Store ou Google Play.</p>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>8</span>
                  Limitation de responsabilité
                </h2>
                <div className="ps-4">
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="fas fa-heart-broken me-2 text-warning"></i> NouMatch ne peut garantir la rencontre d'un partenaire</li>
                    <li className="mb-2"><i className="fas fa-users me-2 text-warning"></i> Nous ne sommes pas responsables des interactions ou disputes entre utilisateurs</li>
                    <li className="mb-2"><i className="fas fa-mobile-alt me-2 text-warning"></i> Nous ne sommes pas responsables des interruptions de service indépendantes de notre volonté</li>
                    <li className="mb-2"><i className="fas fa-database me-2 text-warning"></i> Nous ne pouvons garantir une disponibilité continue de tous les services</li>
                  </ul>
                </div>
                <div className="alert alert-warning mt-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Important :</strong> NouMatch est une plateforme de rencontre, mais nous ne réalisons pas de vérification approfondie des antécédents. Restez vigilant et protégez vos informations personnelles.
                </div>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>9</span>
                  Résiliation
                </h2>
                <p>Vous pouvez supprimer votre compte à tout moment dans les paramètres. En cas de violation grave de nos conditions, nous nous réservons le droit de :</p>
                <ul>
                  <li>Vous avertir et suspendre temporairement votre compte</li>
                  <li>Supprimer définitivement votre compte sans préavis</li>
                  <li>Interdire la création d'un nouveau compte</li>
                  <li>Signaler les comportements illégaux aux autorités compétentes</li>
                </ul>
              </div>

              <div className="mt-5">
                <h2 className="h3 mb-3 d-flex align-items-center">
                  <span className="badge bg-danger rounded-circle me-3 p-2" style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>10</span>
                  Juridiction et lois applicables
                </h2>
                <p>
                  Ces conditions sont régies par la législation applicable dans votre pays de résidence. En cas de litige, nous privilégions la médiation avant toute action légale.
                </p>
                <div className="row mt-3">
                  <div className="col-md-6">
                    <div className="border rounded-3 p-3 text-center">
                      <i className="fas fa-gavel fa-2x text-danger mb-2"></i>
                      <h6>Médiation</h6>
                      <small className="text-muted">Solution privilégiée avant toute action judiciaire</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="border rounded-3 p-3 text-center">
                      <i className="fas fa-globe fa-2x text-danger mb-2"></i>
                      <h6>Conformité RGPD</h6>
                      <small className="text-muted">Pour les utilisateurs européens</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-top">
                <h2 className="h3 mb-3">Contact</h2>
                <p>
                  Pour toute question concernant ces conditions, contactez-nous su notre page principale<br />
                 
                </p>
              </div>
            </div>
            
            <div className="text-center text-muted mt-4">
              <small>© 2026 NouMatch. Tous droits réservés.</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}