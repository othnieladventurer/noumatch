import React from "react";
import { Accordion } from "react-bootstrap";

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne NouMatch ?",
    a: "NouMatch vous permet d'accéder facilement à un tableau de profils correspondant à vos préférences. Une fois votre profil créé, vous pouvez explorer les profils des autres membres selon vos critères de recherche, que ce soit par genre ou intérêts communs.",
  },
  {
    q: "Comment créer un profil ?",
    a: "Pour créer un profil, rendez-vous sur la page d'inscription et remplissez les informations requises. Assurez-vous de fournir des détails précis afin d'optimiser la pertinence de vos correspondances et d'améliorer vos interactions sur la plateforme.",
  },
  {
    q: "Puis-je contrôler qui voit mon profil ?",
    a: "Oui, NouMatch vous offre un contrôle complet sur la visibilité de votre profil. Vous pouvez choisir qui peut le consulter et bloquer tout utilisateur indésirable, garantissant ainsi une expérience sécurisée et personnalisée.",
  },
  {
    q: "Comment mes informations personnelles sont-elles protégées ?",
    a: "NouMatch applique des protocoles de sécurité avancés et des politiques strictes de protection de la vie privée. Vos données sont cryptées et toute violation des règles de confidentialité peut entraîner un blocage immédiat ou un bannissement définitif des contrevenants.",
  },
  {
    q: "Puis-je supprimer mon compte ?",
    a: "Absolument. Vous avez la possibilité de supprimer votre compte à tout moment. Toutes vos informations seront définitivement supprimées de nos serveurs conformément à nos politiques de confidentialité.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-5" style={{ background: "#fff" }}>
      <div className="container">
        <div className="text-center mb-5">
          <span
            style={{
              display: "inline-block",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#dc2626",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
            }}
          >
            Questions fréquentes
          </span>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(1.85rem, 3.5vw, 2.6rem)",
              color: "#0f172a",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: "0 0 0.75rem",
            }}
          >
            FAQ
          </h2>
          <p style={{ color: "#64748b", maxWidth: "580px", margin: "0 auto", lineHeight: 1.7, fontSize: "0.97rem" }}>
            Retrouvez ici les réponses aux questions les plus courantes concernant l'utilisation de NouMatch.
          </p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <Accordion defaultActiveKey="0" flush className="nm-faq">
              {FAQ_ITEMS.map((item, i) => (
                <Accordion.Item eventKey={String(i)} key={i}>
                  <Accordion.Header>{item.q}</Accordion.Header>
                  <Accordion.Body>{item.a}</Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
