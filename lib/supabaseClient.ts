"use client";

const ANONYMOUS_STORAGE_KEY = "midnight-tarot-anonymous-client-v1";
let memoryAnonymousClient: AnonymousClientSession | undefined;

export type AnonymousClientSession = {
  clientId: string;
  clientSecret: string;
  createdAt: string;
};

function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function loadAnonymousClient(): AnonymousClientSession {
  if (typeof window === "undefined") {
    return { clientId: "server", clientSecret: "server-secret-placeholder-value", createdAt: new Date().toISOString() };
  }
  if (memoryAnonymousClient) return memoryAnonymousClient;
  try {
    const value = window.localStorage.getItem(ANONYMOUS_STORAGE_KEY);
    if (value) {
      const parsed = JSON.parse(value) as AnonymousClientSession;
      if (parsed.clientId && parsed.clientSecret) {
        memoryAnonymousClient = parsed;
        return parsed;
      }
    }
  } catch {
    // fall through and create a fresh anonymous client.
  }
  const next = {
    clientId: randomToken(18),
    clientSecret: randomToken(42),
    createdAt: new Date().toISOString(),
  };
  memoryAnonymousClient = next;
  try {
    window.localStorage.setItem(ANONYMOUS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep a stable identity for this tab when persistent storage is unavailable.
  }
  return next;
}

export async function anonymousFetch(path: string, init: RequestInit = {}) {
  const client = loadAnonymousClient();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  headers.set("X-MT-Client-Id", client.clientId);
  headers.set("X-MT-Client-Secret", client.clientSecret);
  return fetch(path, { ...init, headers });
}
