// src/components/FAQ.jsx
import React from "react";
import { Accordion } from "react-bootstrap";

export default function FAQ() {
  return (
    <section id="faq" className="py-5">
      <div className="container">
        <h2 className="fw-bold text-center mb-4">FAQ - Questions fréquentes</h2>
        <p className="text-center text-muted mb-5">
          Retrouvez ici les réponses aux questions les plus courantes concernant l’utilisation de NouMatch.
        </p>

        <Accordion defaultActiveKey="0" flush>
          <Accordion.Item eventKey="0">
            <Accordion.Header>Comment fonctionne NouMatch ?</Accordion.Header>
            <Accordion.Body>
              NouMatch vous permet d’accéder facilement à un tableau de profils correspondant à vos préférences. Une fois votre profil créé, vous pouvez explorer les profils des autres membres selon vos critères de recherche, que ce soit par genre ou intérêts communs.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Comment créer un profil ?</Accordion.Header>
            <Accordion.Body>
              Pour créer un profil, rendez-vous sur la page d’inscription et remplissez les informations requises. Assurez-vous de fournir des détails précis afin d’optimiser la pertinence de vos correspondances et d’améliorer vos interactions sur la plateforme.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>Puis-je contrôler qui voit mon profil ?</Accordion.Header>
            <Accordion.Body>
              Oui, NouMatch vous offre un contrôle complet sur la visibilité de votre profil. Vous pouvez choisir qui peut le consulter et bloquer tout utilisateur indésirable, garantissant ainsi une expérience sécurisée et personnalisée.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Comment mes informations personnelles sont-elles protégées ?</Accordion.Header>
            <Accordion.Body>
              NouMatch applique des protocoles de sécurité avancés et des politiques strictes de protection de la vie privée. Vos données sont cryptées et toute violation des règles de confidentialité peut entraîner un blocage immédiat ou un bannissement définitif des contrevenants.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Puis-je supprimer mon compte ?</Accordion.Header>
            <Accordion.Body>
              Absolument. Vous avez la possibilité de supprimer votre compte à tout moment. Toutes vos informations seront définitivement supprimées de nos serveurs conformément à nos politiques de confidentialité.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </section>
  );
}