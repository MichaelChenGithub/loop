import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LAUNCH_AUTH_FLOW_MESSAGE_TYPE,
  SIGN_IN_WITH_GOOGLE_MESSAGE_TYPE
} from "./auth-messages";
import { createAuthClient, type ChromeIdentity, type ChromeStorageArea } from "./auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStorage(initial: Record<string, string> = {}): ChromeStorageArea {
  const store = { ...initial };
  return {
    get: vi.fn(async (key: string) => ({ [key]: store[key] })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(items)) {
        store[k] = v as string;
      }
    }),
    remove: vi.fn(async (key: string) => {
      delete store[key];
    }),
  };
}

function makeIdentity(redirectUrl = "https://ext.chromiumapp.org/callback?code=auth-code"): ChromeIdentity {
  return {
    getRedirectURL: vi.fn(() => "https://ext.chromiumapp.org/"),
    launchWebAuthFlow: vi.fn().mockResolvedValue(redirectUrl),
  };
}

// Minimal Supabase-like client shape returned by createClient mock
function makeSupabaseMock({
  session = null as { access_token: string } | null,
  oauthUrl = "https://accounts.google.com/o/oauth2/auth?...",
  exchangeError = null as string | null,
} = {}) {
  return {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: oauthUrl },
        error: null,
      }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: {},
        error: exchangeError ? { message: exchangeError } : null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createAuthClient", () => {
  // We mock the Supabase createClient at module level so we can control the
  // returned client without making real network calls.
  let supabaseMock: ReturnType<typeof makeSupabaseMock>;
  let createClientMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    supabaseMock = makeSupabaseMock({
      session: { access_token: "token-abc" },
    });

    createClientMock = vi.fn(() => supabaseMock);
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: createClientMock,
    }));
  });

  it("initializes Supabase auth with PKCE flow", async () => {
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity: makeIdentity(),
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    await client.getSession();

    expect(createClientMock).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          flowType: "pkce",
          detectSessionInUrl: false,
          autoRefreshToken: true,
          persistSession: true,
        }),
      }),
    );
  });

  it("getAuthHeader returns a Bearer header when a session exists", async () => {
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity: makeIdentity(),
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    const header = await client.getAuthHeader();

    expect(header).toEqual({ Authorization: "Bearer token-abc" });
  });

  it("getAuthHeader throws when there is no active session", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity: makeIdentity(),
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    await expect(client.getAuthHeader()).rejects.toThrow("Not signed in");
  });

  it("signInWithGoogle exchanges the redirect code for a session", async () => {
    const { createAuthClient: create } = await import("./auth");
    const identity = makeIdentity("https://ext.chromiumapp.org/callback?code=mycode");
    const client = create({
      storage: makeStorage(),
      identity,
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    await client.signInWithGoogle();

    expect(supabaseMock.auth.exchangeCodeForSession).toHaveBeenCalledWith("mycode");
  });

  it("signInWithGoogle throws when exchange fails", async () => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { message: "exchange failed" },
    });
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity: makeIdentity(),
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    await expect(client.signInWithGoogle()).rejects.toThrow("exchange failed");
  });

  it("signInWithGoogle throws when the OAuth flow is cancelled", async () => {
    const identity = makeIdentity();
    identity.launchWebAuthFlow = vi.fn().mockRejectedValue(new Error("OAuth flow was cancelled"));
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity,
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    await expect(client.signInWithGoogle()).rejects.toThrow("OAuth flow was cancelled");
  });

  it("getSession returns null when signed out", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity: makeIdentity(),
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    expect(await client.getSession()).toBeNull();
  });

  it("signOut delegates to supabase.auth.signOut", async () => {
    const { createAuthClient: create } = await import("./auth");
    const client = create({
      storage: makeStorage(),
      identity: makeIdentity(),
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key",
    });

    await client.signOut();

    expect(supabaseMock.auth.signOut).toHaveBeenCalledOnce();
  });
});

describe("contentScriptIdentity", () => {
  it("builds the chromiumapp redirect URL from chrome.runtime.id", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghijklmnop",
        sendMessage: vi.fn(),
      },
    });

    const { contentScriptIdentity } = await import("./auth");

    expect(contentScriptIdentity.getRedirectURL()).toBe(
      "https://abcdefghijklmnop.chromiumapp.org/",
    );
  });

  it("routes launchWebAuthFlow through the background service worker", async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://abcdefghijklmnop.chromiumapp.org/?code=auth-code",
    });

    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghijklmnop",
        sendMessage,
      },
    });

    const { contentScriptIdentity } = await import("./auth");

    await expect(
      contentScriptIdentity.launchWebAuthFlow({
        url: "https://accounts.google.com/o/oauth2/auth?...",
        interactive: true,
      }),
    ).resolves.toBe("https://abcdefghijklmnop.chromiumapp.org/?code=auth-code");

    expect(sendMessage).toHaveBeenCalledWith({
      type: LAUNCH_AUTH_FLOW_MESSAGE_TYPE,
      url: "https://accounts.google.com/o/oauth2/auth?...",
      interactive: true,
    });
  });
});

describe("createContentScriptAuthClient", () => {
  it("routes Google sign-in through the background worker", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });

    vi.stubGlobal("chrome", {
      runtime: {
        id: "abcdefghijklmnop",
        sendMessage
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn()
        }
      }
    });

    const { createContentScriptAuthClient } = await import("./auth");
    const client = createContentScriptAuthClient({
      storage: makeStorage(),
      runtime: {
        sendMessage
      } as never,
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "anon-key"
    });

    await client.signInWithGoogle();

    expect(sendMessage).toHaveBeenCalledWith({
      type: SIGN_IN_WITH_GOOGLE_MESSAGE_TYPE
    });
  });
});
