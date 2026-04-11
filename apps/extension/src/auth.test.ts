import { beforeEach, describe, expect, it, vi } from "vitest";

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

  beforeEach(async () => {
    supabaseMock = makeSupabaseMock({
      session: { access_token: "token-abc" },
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => supabaseMock),
    }));
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
