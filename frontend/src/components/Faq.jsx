import React from "react";
import { Accordion } from "react-bootstrap";
import { HOME_FAQ_ITEMS } from "../lib/seo";

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
              {HOME_FAQ_ITEMS.map((item, i) => (
                <Accordion.Item eventKey={String(i)} key={item.q}>
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
