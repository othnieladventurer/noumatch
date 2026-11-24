import * as session from "../auth/session";

// The Django API mounts every app under /api/ (api/urls.py), so the base URL
// already includes the prefix and request paths start at "/users/...".
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://api.noumatch.com/api").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

function buildHeaders(accessToken: string | null, body: unknown): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  return headers;
}

function send(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const body = options.body;
  const payload =
    body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(accessToken, body),
    body: payload,
  });
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function apiErrorMessage(error: unknown, fallback = "Une erreur est survenue. Réessayez."): string {
  if (error instanceof ApiError) {
    const data = error.data;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.detail === "string") return record.detail;
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
      for (const value of Object.values(record)) {
        if (Array.isArray(value) && typeof value[0] === "string") return value[0];
        if (typeof value === "string") return value;
      }
    }
  }
  return fallback;
}

let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = await session.getRefreshToken();
      if (!refresh) return null;

      // The API rotates refresh tokens and blacklists the used one,
      // so the freshly returned pair must replace the stored one.
      const response = await send(
        "/users/token/refresh/",
        { method: "POST", body: { refresh } },
        null,
      );

      if (!response.ok) {
        await session.clearTokens();
        return null;
      }

      const data = (await parseBody(response)) as { access?: string; refresh?: string } | null;
      if (!data?.access) {
        await session.clearTokens();
        return null;
      }

      await session.saveTokens({ access: data.access, refresh: data.refresh ?? null });
      return data.access;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth !== false;
  let accessToken = auth ? await session.getAccessToken() : null;
  let response = await send(path, options, accessToken);

  if (response.status === 401 && auth) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      accessToken = nextToken;
      response = await send(path, options, accessToken);
    }
  }

  const data = await parseBody(response);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && typeof (data as Record<string, unknown>).detail === "string"
        ? String((data as Record<string, unknown>).detail)
        : `Erreur ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
