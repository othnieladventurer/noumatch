const readEntry = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const readFreshCache = (key, ttlMs = 60000) => {
  const entry = readEntry(key);
  if (!entry?.timestamp) return null;
  if (Date.now() - entry.timestamp > ttlMs) return null;
  return entry.data ?? null;
};

export const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch {
    // Ignore quota/storage errors in cache path.
  }
};
