import React from "react";

export default function BrandLogo({ variant = "full", height = 34, className = "", alt = "NouMatch" }) {
  const src = variant === "mark" ? "/noumatch-logo-mark.png" : "/noumatch-logo.png";

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ height, width: "auto", display: "block" }}
      loading="eager"
      decoding="async"
    />
  );
}

