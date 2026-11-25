/**
 * Account tiers, mirroring frontend/src/utils/accountAccess.js and the Django
 * `User.account_type` choices (free / premium / god_mode).
 *
 * "god_mode" bypasses every client-side gate, so a god-mode account sees exactly
 * what a premium account sees plus nothing held back.
 */

export type AccountTier = "free" | "premium" | "god_mode";

export type PlanPerk = { label: string; included: boolean };

export type Plan = {
  tier: AccountTier;
  name: string;
  icon: string;
  badge: string;
  tagline: string;
  background: string;
  color: string;
  perks: PlanPerk[];
  seeWhoLiked: boolean;
  unlimitedLikes: boolean;
};

type AccountLike = { account_type?: unknown } | string | null | undefined;

export function normalizeAccountType(accountType?: unknown): AccountTier {
  const value = String(accountType ?? "free")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (["god", "god_mode", "godmode"].includes(value)) return "god_mode";
  if (["premium", "gold"].includes(value)) return "premium";
  return "free";
}

export function accountTier(user?: AccountLike): AccountTier {
  return normalizeAccountType(typeof user === "string" ? user : user?.account_type);
}

export function isPremium(user?: AccountLike): boolean {
  return accountTier(user) !== "free";
}

export function isGodMode(user?: AccountLike): boolean {
  return accountTier(user) === "god_mode";
}

/** Same gate as the web `canSeeWhoLiked()`: Premium and God Mode only. */
export function canSeeWhoLiked(user?: AccountLike): boolean {
  return isPremium(user);
}

/** Premium and God Mode are unlimited server-side (api/interactions/views.py). */
export function hasUnlimitedLikes(user?: AccountLike): boolean {
  return isPremium(user);
}

export const PLANS: Record<AccountTier, Plan> = {
  free: {
    tier: "free",
    name: "Compte Gratuit",
    icon: "",
    badge: "Compte Gratuit",
    tagline: "Les essentiels pour commencer.",
    background: "#6B7280",
    color: "#ffffff",
    seeWhoLiked: false,
    unlimitedLikes: false,
    perks: [
      { label: "20 likes par jour", included: true },
      { label: "3 coups de cœur par jour", included: true },
      { label: "Voir qui t'a liké", included: false },
    ],
  },
  premium: {
    tier: "premium",
    name: "Premium",
    icon: "⭐",
    badge: "⭐ Compte Premium",
    tagline: "Toutes les fonctions, sans limite.",
    background: "#F5B301",
    color: "#101D3A",
    seeWhoLiked: true,
    unlimitedLikes: true,
    perks: [
      { label: "Likes illimités", included: true },
      { label: "Voir qui t'a liké", included: true },
      { label: "3 coups de cœur par jour", included: true },
    ],
  },
  god_mode: {
    tier: "god_mode",
    name: "God Mode",
    icon: "👑",
    badge: "👑 God Mode",
    tagline: "Accès total, aucune restriction.",
    background: "#D41455",
    color: "#ffffff",
    seeWhoLiked: true,
    unlimitedLikes: true,
    perks: [
      { label: "Likes illimités", included: true },
      { label: "Voir qui t'a liké", included: true },
      { label: "Accès complet à l'application", included: true },
    ],
  },
};

export function planFor(user?: AccountLike): Plan {
  return PLANS[accountTier(user)];
}
