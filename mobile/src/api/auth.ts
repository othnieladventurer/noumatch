import { request } from "./client";
import * as session from "../auth/session";

export type Tokens = { access: string; refresh?: string };

export type Me = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  profile_photo?: string | null;
  [key: string]: unknown;
};

export type Gender = "female" | "male";

export type CanRegisterResponse = {
  exists?: boolean;
  email_available?: boolean;
  can_register?: boolean;
  message?: string;
};

export type PendingRegistration = {
  user_id: number;
  pending_registration_id: number;
  message?: string;
  expires_in?: number;
};

export type RegisterInput = {
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  gender: Gender;
  password: string;
  password2: string;
  country: string;
  city: string;
  photo: { uri: string; name: string; type: string };
};

export async function login(email: string, password: string): Promise<Tokens> {
  const tokens = await request<Tokens>("/users/login/", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
    auth: false,
  });
  await session.saveTokens(tokens);
  return tokens;
}

export function me(): Promise<Me> {
  return request<Me>("/users/me/");
}

export function checkCanRegister(email: string, gender?: Gender): Promise<CanRegisterResponse> {
  const query = `?email=${encodeURIComponent(email)}${gender ? `&gender=${gender}` : ""}`;
  return request<CanRegisterResponse>(`/users/check-can-register/${query}`, { auth: false });
}

export async function register(input: RegisterInput): Promise<PendingRegistration> {
  const form = new FormData();
  form.append("first_name", input.first_name.trim());
  form.append("last_name", input.last_name.trim());
  form.append("email", input.email.trim().toLowerCase());
  form.append("birth_date", input.birth_date);
  form.append("gender", input.gender);
  form.append("password", input.password);
  form.append("password2", input.password2);
  form.append("country", input.country);
  form.append("city", input.city);
  form.append("profile_photo", {
    uri: input.photo.uri,
    name: input.photo.name,
    type: input.photo.type,
  } as unknown as Blob);

  return request<PendingRegistration>("/users/register/", { method: "POST", body: form, auth: false });
}

export async function verifyOtp(userId: number, code: string): Promise<Tokens> {
  const data = await request<Tokens & { user?: Me }>("/users/verify-otp/", {
    method: "POST",
    body: { user_id: userId, code },
    auth: false,
  });
  if (data.access) {
    await session.saveTokens(data);
  }
  return data;
}

export function resendOtp(userId: number): Promise<{ expires_in?: number }> {
  return request<{ expires_in?: number }>("/users/resend-otp/", {
    method: "POST",
    body: { user_id: userId },
    auth: false,
  });
}

export async function logout(): Promise<void> {
  const refresh = await session.getRefreshToken();
  try {
    await request("/users/logout/", { method: "POST", body: refresh ? { refresh } : {} });
  } catch {
    // The local session is cleared regardless of the server response.
  } finally {
    await session.clearTokens();
  }
}
