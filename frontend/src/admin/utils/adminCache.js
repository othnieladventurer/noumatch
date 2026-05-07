const CURRENT_PAGE_CACHE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
  if (entry.pageCacheId !== CURRENT_PAGE_CACHE_ID) return null;
  if (Date.now() - entry.timestamp > ttlMs) return null;
  return entry.data ?? null;
};

export const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        pageCacheId: CURRENT_PAGE_CACHE_ID,
        data,
      })
    );
  } catch {
    // Ignore quota/storage errors in cache path.
  }
};

export const clearCache = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors in cache invalidation path.
  }
};

export const clearCacheByPrefix = (prefix) => {
  try {
    const keys = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage errors in cache invalidation path.
  }
};
