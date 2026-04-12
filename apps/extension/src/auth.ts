import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import {
  LAUNCH_AUTH_FLOW_MESSAGE_TYPE,
  SIGN_IN_WITH_GOOGLE_MESSAGE_TYPE
} from "./auth-messages";

// ---------------------------------------------------------------------------
// Dependency types (injectable for testing)
// ---------------------------------------------------------------------------

export type ChromeStorageArea = {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export type ChromeIdentity = {
  getRedirectURL: () => string;
  launchWebAuthFlow: (details: {
    url: string;
    interactive: boolean;
  }) => Promise<string>;
};

export type ChromeRuntimeMessenger = {
  sendMessage: (message: unknown) => Promise<unknown>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeStorageAdapter(storage: ChromeStorageArea) {
  return {
    getItem: async (key: string): Promise<string | null> => {
      const result = await storage.get(key);
      const value = result[key];
      return typeof value === "string" ? value : null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await storage.set({ [key]: value });
    },
    removeItem: async (key: string): Promise<void> => {
      await storage.remove(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Auth client
// ---------------------------------------------------------------------------

export type AuthClient = {
  signInWithGoogle: () => Promise<void>;
  getSession: () => Promise<Session | null>;
  getAuthHeader: () => Promise<{ Authorization: string }>;
  signOut: () => Promise<void>;
};

export function createAuthClient({
  storage,
  identity,
  supabaseUrl,
  supabaseKey,
}: {
  storage: ChromeStorageArea;
  identity: ChromeIdentity;
  supabaseUrl: string;
  supabaseKey: string;
}): AuthClient {
  // Lazily create the Supabase client so that modules importing authClient
  // don't fail in test environments where env vars are not set.
  let _supabase: SupabaseClient | null = null;

  const getSupabase = (): SupabaseClient => {
    if (!_supabase) {
      if (!supabaseUrl) throw new Error("PLASMO_PUBLIC_SUPABASE_URL is not set");
      _supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: makeStorageAdapter(storage),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      });
    }
    return _supabase;
  };

  return {
    async signInWithGoogle() {
      const redirectTo = identity.getRedirectURL();

      const { data, error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        throw new Error(error?.message ?? "Failed to get OAuth URL");
      }

      const redirectUrl = await identity.launchWebAuthFlow({
        url: data.url,
        interactive: true,
      });

      const url = new URL(redirectUrl);
      const code = url.searchParams.get("code");

      if (!code) {
        throw new Error("No authorization code in redirect URL");
      }

      const { error: exchangeError } =
        await getSupabase().auth.exchangeCodeForSession(code);

      if (exchangeError) {
        throw new Error(exchangeError.message);
      }
    },

    async getSession(): Promise<Session | null> {
      const { data } = await getSupabase().auth.getSession();
      return data.session;
    },

    async getAuthHeader(): Promise<{ Authorization: string }> {
      const { data } = await getSupabase().auth.getSession();
      if (!data.session) {
        throw new Error("Not signed in");
      }
      return { Authorization: `Bearer ${data.session.access_token}` };
    },

    async signOut(): Promise<void> {
      await getSupabase().auth.signOut();
    },
  };
}

export function createContentScriptAuthClient({
  storage,
  runtime,
  supabaseUrl,
  supabaseKey,
}: {
  storage: ChromeStorageArea;
  runtime: ChromeRuntimeMessenger;
  supabaseUrl: string;
  supabaseKey: string;
}): AuthClient {
  const baseClient = createAuthClient({
    storage,
    identity: contentScriptIdentity,
    supabaseUrl,
    supabaseKey,
  });

  return {
    async signInWithGoogle() {
      const result: { ok: boolean; error?: string } =
        await runtime.sendMessage({
          type: SIGN_IN_WITH_GOOGLE_MESSAGE_TYPE
        }) as { ok: boolean; error?: string };

      if (!result?.ok) {
        throw new Error(result?.error ?? "Google sign-in failed");
      }
    },
    getSession: () => baseClient.getSession(),
    getAuthHeader: () => baseClient.getAuthHeader(),
    signOut: () => baseClient.signOut(),
  };
}

// ---------------------------------------------------------------------------
// Real chrome identity adapter (wraps callback API into Promise)
// ---------------------------------------------------------------------------

export const realChromeIdentity: ChromeIdentity = {
  getRedirectURL: () => chrome.identity.getRedirectURL(),
  launchWebAuthFlow: (details) =>
    new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(details, (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!responseUrl) {
          reject(new Error("OAuth flow was cancelled"));
        } else {
          resolve(responseUrl);
        }
      });
    }),
};

// ---------------------------------------------------------------------------
// Real chrome storage adapter
// ---------------------------------------------------------------------------

export const realChromeStorage: ChromeStorageArea = {
  get: (key) => chrome.storage.local.get(key),
  set: (items) => chrome.storage.local.set(items),
  remove: (key) => chrome.storage.local.remove(key),
};

// ---------------------------------------------------------------------------
// Content-script identity adapter
//
// chrome.identity is not available in content scripts. This adapter:
//   - constructs the redirect URL from chrome.runtime.id (available everywhere)
//   - routes launchWebAuthFlow through the background SW via message passing
// ---------------------------------------------------------------------------

export const contentScriptIdentity: ChromeIdentity = {
  getRedirectURL: () => `https://${chrome.runtime.id}.chromiumapp.org/`,
  launchWebAuthFlow: async (details) => {
    const result: { ok: boolean; redirectUrl?: string; error?: string } =
      await chrome.runtime.sendMessage({
        type: LAUNCH_AUTH_FLOW_MESSAGE_TYPE,
        url: details.url,
        interactive: details.interactive
      });
    if (!result?.ok) {
      throw new Error(result?.error ?? "Auth flow failed");
    }
    return result.redirectUrl!;
  }
};

// ---------------------------------------------------------------------------
// Singleton using real chrome APIs
// ---------------------------------------------------------------------------

const unavailableAuthClient: AuthClient = {
  async signInWithGoogle() {
    throw new Error("chrome.runtime is not available");
  },
  async getSession() {
    throw new Error("chrome.runtime is not available");
  },
  async getAuthHeader() {
    throw new Error("chrome.runtime is not available");
  },
  async signOut() {
    throw new Error("chrome.runtime is not available");
  },
};

export const authClient =
  typeof chrome !== "undefined" && chrome.runtime
    ? createContentScriptAuthClient({
        storage: realChromeStorage,
        runtime: chrome.runtime,
        supabaseUrl: process.env.PLASMO_PUBLIC_SUPABASE_URL ?? "",
        supabaseKey: process.env.PLASMO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      })
    : unavailableAuthClient;
