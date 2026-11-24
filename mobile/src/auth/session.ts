import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "noumatch.access";
const REFRESH_KEY = "noumatch.refresh";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function saveTokens(tokens: { access: string; refresh?: string | null }): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access);
  if (tokens.refresh) {
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh);
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
