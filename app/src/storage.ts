import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const EMAIL_KEY = "auth_email";

type KVStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

// expo-secure-store has no web implementation, so fall back to localStorage on
// web and to the OS keychain/keystore on native.
const webStore: KVStore = {
  getItem: async (k) => (typeof localStorage !== "undefined" ? localStorage.getItem(k) : null),
  setItem: async (k, v) => { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); },
  removeItem: async (k) => { if (typeof localStorage !== "undefined") localStorage.removeItem(k); }
};

const nativeStore: KVStore = {
  getItem: (k) => SecureStore.getItemAsync(k),
  setItem: (k, v) => SecureStore.setItemAsync(k, v),
  removeItem: (k) => SecureStore.deleteItemAsync(k)
};

const store: KVStore = Platform.OS === "web" ? webStore : nativeStore;

export type Session = { token: string; email: string };

/** Reads a persisted session. Returns an empty session if none/on error. */
export async function loadSession(): Promise<Session> {
  try {
    const [token, email] = await Promise.all([store.getItem(TOKEN_KEY), store.getItem(EMAIL_KEY)]);
    return { token: token ?? "", email: email ?? "" };
  } catch {
    return { token: "", email: "" };
  }
}

/** Persists a session. Failure is non-fatal — the session just won't survive a restart. */
export async function saveSession(token: string, email: string): Promise<void> {
  try {
    await Promise.all([store.setItem(TOKEN_KEY, token), store.setItem(EMAIL_KEY, email)]);
  } catch {
    // ignore
  }
}

/** Clears the persisted session. */
export async function clearSession(): Promise<void> {
  try {
    await Promise.all([store.removeItem(TOKEN_KEY), store.removeItem(EMAIL_KEY)]);
  } catch {
    // ignore
  }
}
