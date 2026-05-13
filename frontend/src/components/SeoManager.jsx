import React from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { getSeoConfig } from "../lib/seo";

export default function SeoManager() {
  const location = useLocation();
  const { title, description, canonical, ogImage, robots, jsonLd, hreflangs } = getSeoConfig(location.pathname);
  const schemaItems = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet htmlAttributes={{ lang: "fr" }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      {hreflangs.map((item) => (
        <link key={`${item.hrefLang}-${item.href}`} rel="alternate" hrefLang={item.hrefLang} href={item.href} />
      ))}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schemaItems.map((schema, index) => (
        <script key={`json-ld-${index}`} type="application/ld+json" data-nm-seo="json-ld">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
