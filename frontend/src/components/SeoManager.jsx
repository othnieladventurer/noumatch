import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSeoConfig } from "../lib/seo";

const upsertMeta = (attribute, key, content) => {
  if (!content) {
    return;
  }

  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const removeMeta = (attribute, key) => {
  document.head.querySelectorAll(`meta[${attribute}="${key}"]`).forEach((element) => {
    element.remove();
  });
};

const upsertCanonical = (href) => {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const removeHreflangs = () => {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => {
    element.remove();
  });
};

const applyJsonLd = (schemaItems) => {
  document.head.querySelectorAll('script[data-nm-seo="json-ld"]').forEach((element) => {
    element.remove();
  });

  schemaItems.forEach((schema) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.nmSeo = "json-ld";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
};

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description, canonical, ogImage, robots, jsonLd, hreflangs } = getSeoConfig(pathname);
    const schemaItems = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

    document.documentElement.setAttribute("lang", "fr");
    document.title = title;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);

    if (canonical) {
      upsertCanonical(canonical);
    } else {
      document.head.querySelectorAll('link[rel="canonical"]').forEach((element) => {
        element.remove();
      });
    }

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    if (canonical) {
      upsertMeta("property", "og:url", canonical);
    } else {
      removeMeta("property", "og:url");
    }

    removeHreflangs();
    hreflangs.forEach((item) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", item.hrefLang);
      link.setAttribute("href", item.href);
      document.head.appendChild(link);
    });

    applyJsonLd(schemaItems);
  }, [pathname]);

  return null;
}
