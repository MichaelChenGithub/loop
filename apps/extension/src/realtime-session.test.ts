import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchClientSecret, RealtimeSession } from "./realtime-session";

describe("RealtimeSession.start", () => {
  const originalPeerConnection = globalThis.RTCPeerConnection;
  const originalFetch = globalThis.fetch;
  const originalNavigator = globalThis.navigator;
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, "RTCPeerConnection", {
      configurable: true,
      value: originalPeerConnection
    });
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument
    });
    vi.restoreAllMocks();
  });

  it("uses the GA realtime endpoint without the beta header", async () => {
    const addTrack = vi.fn();
    const close = vi.fn();
    const stop = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("answer-sdp", {
        status: 200,
        headers: { "Content-Type": "application/sdp" }
      })
    );

    Object.defineProperty(globalThis, "RTCPeerConnection", {
      configurable: true,
      value: vi.fn(
        () =>
          ({
            createDataChannel: vi.fn(),
            createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "offer-sdp" }),
            setLocalDescription: vi.fn().mockResolvedValue(undefined),
            setRemoteDescription: vi.fn().mockResolvedValue(undefined),
            addTrack,
            close,
            ontrack: null
          }) as unknown as RTCPeerConnection
      ) as unknown as typeof RTCPeerConnection
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop }],
            getAudioTracks: () => []
          } as unknown as MediaStream)
        }
      }
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body: {
          appendChild: vi.fn()
        },
        createElement: vi.fn(() => ({
          autoplay: false,
          srcObject: null,
          remove: vi.fn()
        }))
      }
    });
    globalThis.fetch = fetchMock;

    const session = new RealtimeSession();

    await session.start("ek_test_123", "gpt-realtime");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/calls",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer ek_test_123",
          "Content-Type": "application/sdp"
        },
        body: "offer-sdp"
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          "openai-beta": expect.anything()
        })
      })
    );
    expect(addTrack).toHaveBeenCalled();
  });

  it("surfaces the upstream mismatch error message when session startup fails", async () => {
    Object.defineProperty(globalThis, "RTCPeerConnection", {
      configurable: true,
      value: vi.fn(
        () =>
          ({
            createDataChannel: vi.fn(),
            createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "offer-sdp" }),
            setLocalDescription: vi.fn().mockResolvedValue(undefined),
            setRemoteDescription: vi.fn().mockResolvedValue(undefined),
            addTrack: vi.fn(),
            close: vi.fn(),
            ontrack: null
          }) as unknown as RTCPeerConnection
      ) as unknown as typeof RTCPeerConnection
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [],
            getAudioTracks: () => []
          } as unknown as MediaStream)
        }
      }
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body: {
          appendChild: vi.fn()
        },
        createElement: vi.fn(() => ({
          autoplay: false,
          srcObject: null,
          remove: vi.fn()
        }))
      }
    });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "api_version_mismatch",
            message:
              "API version mismatch. You cannot start a Realtime beta session with a GA client secret."
          }
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    const session = new RealtimeSession();

    await expect(session.start("ek_test_123", "gpt-realtime")).rejects.toThrow(
      "API version mismatch"
    );
  });
});

describe("fetchClientSecret", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts the normalized problem payload to the session broker", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          value: "ek_123",
          expires_at: 1_900_000_000,
          session: {
            id: "sess_123",
            model: "gpt-realtime-2025-08-25",
            object: "realtime.session",
            type: "realtime"
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );
    globalThis.fetch = fetchMock;

    await fetchClientSecret("http://localhost:8000", {
      problem: {
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        description: "Given an array of integers nums and an integer target.",
        examples: [{ input: "nums = [2,7], target = 9", output: "[0,1]" }],
        constraints: ["2 <= nums.length <= 10^4"]
      }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          problem: {
            slug: "two-sum",
            title: "Two Sum",
            difficulty: "Easy",
            description: "Given an array of integers nums and an integer target.",
            examples: [{ input: "nums = [2,7], target = 9", output: "[0,1]" }],
            constraints: ["2 <= nums.length <= 10^4"]
          }
        })
      }
    );
  });
});
