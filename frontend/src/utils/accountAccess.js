export const normalizeAccountType = (accountType) =>
  String(accountType || "free")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const canSeeWhoLiked = (user) => {
  const accountType = normalizeAccountType(user?.account_type);
  return ["premium", "gold", "god", "god_mode", "godmode"].includes(accountType);
};
