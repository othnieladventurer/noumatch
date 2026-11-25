import type { ImageSourcePropType } from "react-native";

import type { UserProfile } from "../api/app";

export type AdContact = {
  website?: string;
  email?: string;
  phone?: string;
};

export type AdCampaign = {
  id: string;
  sponsor: string;
  category: string;
  title: string;
  tagline: string;
  description: string[];
  images: { source: ImageSourcePropType; caption: string }[];
  accent: string;
  cta: { label: string; url: string };
  contact?: AdContact;
};

/**
 * Curated in-app campaigns. Each entry is a real NouMatch / InstructSphere
 * marketing message, so the feed never shows an unverified third-party claim.
 * Adding a campaign here is all that is required for it to enter rotation.
 */
export const AD_CAMPAIGNS: AdCampaign[] = [
  {
    id: "premium",
    sponsor: "NouMatch Premium",
    category: "Abonnement",
    title: "Plus de connexions,\nmoins de limites.",
    tagline: "Voyez qui vous a liké et envoyez des Coups de Cœur illimités.",
    description: [
      "Premium est pensé pour les personnes qui veulent aller plus vite, sans perdre l’authenticité qui fait NouMatch.",
      "Débloquez la liste complète des personnes qui s’intéressent à vous, envoyer des Coups de Cœur en illimité et gardez le contrôle de vos rencontres.",
    ],
    images: [
      { source: require("../../assets/ads/premium-01.jpg"), caption: "Des rencontres qui prennent le temps de se créer." },
      { source: require("../../assets/ads/premium-02.jpg"), caption: "Les petits détails qui annoncent une belle connexion." },
    ],
    accent: "#D41455",
    cta: { label: "Découvrir Premium", url: "mailto:support@noumatch.com?subject=NouMatch%20Premium" },
    contact: { website: "https://noumatch.com", email: "support@noumatch.com" },
  },
  {
    id: "securite",
    sponsor: "NouMatch Sécurité",
    category: "Conseils",
    title: "Rencontrez en toute confiance.",
    tagline: "Les bons réflexes avant, pendant et après une rencontre.",
    description: [
      "Une rencontre réussie commence par un échange respectueux. Prenez le temps de discuter, posez vos limites et écoutez votre intuition.",
      "Pour un premier rendez-vous, choisissez un lieu public, prévenez une personne de confiance et gardez vos informations personnelles privées jusqu’à ce que la confiance soit installée.",
    ],
    images: [
      { source: require("../../assets/ads/safety-01.jpg"), caption: "Votre sécurité fait partie d’une rencontre sereine." },
      { source: require("../../assets/ads/safety-02.jpg"), caption: "Prenez le temps de vérifier, d’écouter et de choisir." },
    ],
    accent: "#15803D",
    cta: {
      label: "Lire le guide sécurité",
      url: "https://noumatch.com/securite-rencontres-en-ligne",
    },
    contact: { website: "https://noumatch.com/securite-rencontres-en-ligne", email: "support@noumatch.com" },
  },
  {
    id: "communaute",
    sponsor: "NouMatch",
    category: "Communauté",
    title: "La communauté grandit avec vous.",
    tagline: "Invitez vos amis et faites de nouvelles rencontres près de chez vous.",
    description: [
      "NouMatch grandit chaque jour en Haïti grâce aux personnes qui partagent l’application avec leurs proches.",
      "Invitez quelqu’un qui cherche une rencontre sincère : plus la communauté est grande, plus les connexions qui vous ressemblent deviennent possibles.",
    ],
    images: [
      { source: require("../../assets/ads/community-01.jpg"), caption: "Des amitiés, des histoires et des moments qui rassemblent." },
      { source: require("../../assets/ads/community-02.jpg"), caption: "La communauté NouMatch, partout en Haïti." },
    ],
    accent: "#852A91",
    cta: { label: "Inviter un ami", url: "https://noumatch.com" },
    contact: { website: "https://noumatch.com", email: "support@noumatch.com" },
  },
];

export type FeedItem =
  | { kind: "profile"; key: string; profile: UserProfile }
  | { kind: "ad"; key: string; ad: AdCampaign };

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a deterministic feed for a seed. Re-running it when more profiles load
 * leaves the already-rendered prefix untouched, while a refresh can pass a new
 * seed to reshuffle where the campaigns appear.
 */
export function buildDiscoveryFeed(profiles: UserProfile[], seed: number): FeedItem[] {
  const random = seededRandom(seed);
  const ads = [...AD_CAMPAIGNS];

  // Deterministic Fisher-Yates so the campaign order also varies by refresh.
  for (let index = ads.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [ads[index], ads[swap]] = [ads[swap], ads[index]];
  }

  const items: FeedItem[] = [];
  let nextAdAt = 4 + Math.floor(random() * 2);
  let adIndex = 0;

  profiles.forEach((profile, profileIndex) => {
    items.push({ kind: "profile", key: `profile-${profile.id}`, profile });

    if (profileIndex + 1 === nextAdAt && ads.length > 0) {
      const ad = ads[adIndex % ads.length];
      items.push({ kind: "ad", key: `ad-${ad.id}-${profileIndex}`, ad });
      adIndex += 1;
      // Keep a comfortable gap: 5–7 profiles before the next campaign.
      nextAdAt += 5 + Math.floor(random() * 3);
    }
  });

  return items;
}

export function findCampaign(id?: string): AdCampaign | null {
  return AD_CAMPAIGNS.find((campaign) => campaign.id === id) ?? null;
}
