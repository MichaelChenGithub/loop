import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  getAnchorWrapperStyle,
  LauncherButton,
  resolvePanelAnchorRect,
  resolvePageTone,
  startInterviewSessionAttempt
} from "./InterviewOverlay";

describe("resolvePageTone", () => {
  it("falls back to the document background when the body background is transparent", () => {
    expect(resolvePageTone("rgba(0, 0, 0, 0)", "rgb(255, 255, 255)")).toBe("light");
  });

  it("uses the body background when it is opaque", () => {
    expect(resolvePageTone("rgb(15, 23, 42)", "rgb(255, 255, 255)")).toBe("dark");
  });
});

describe("getAnchorWrapperStyle", () => {
  it("reserves the shared button-height slot so the collapsed toolbar stays vertically centered", () => {
    expect(getAnchorWrapperStyle({ top: 92, right: 1180 }, 1440)).toMatchObject({
      top: "92px",
      right: "260px",
      height: "36px"
    });
  });
});

describe("resolvePanelAnchorRect", () => {
  it("anchors the expanded panel to the live collapsed toolbar when it is available", () => {
    expect(
      resolvePanelAnchorRect(
        {
          top: 88,
          left: 1000,
          width: 180,
          height: 36,
          right: 1180,
          bottom: 124
        },
        {
          top: 92,
          left: 1144,
          width: 36,
          height: 36,
          right: 1180,
          bottom: 128
        }
      )
    ).toMatchObject({
      left: 1000,
      width: 180,
      right: 1180
    });
  });
});

describe("startInterviewSessionAttempt", () => {
  it("captures the latest code snapshot before creating the session", async () => {
    const captureLatestCodeSnapshot = vi.fn().mockResolvedValue({ snapshot: null });
    const fetchClientSecret = vi.fn().mockResolvedValue({
      value: "ek_123",
      expires_at: 1_900_000_000,
      session: {
        id: "sess_123",
        model: "gpt-realtime",
        object: "realtime.session",
        type: "realtime"
      }
    });
    const session = { start: vi.fn().mockResolvedValue(undefined) };
    const createRealtimeSession = vi.fn(() => session);

    await startInterviewSessionAttempt({
      captureLatestCodeSnapshot,
      fetchClientSecret,
      createRealtimeSession,
      getAuthHeader: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
      apiBaseUrl: "http://localhost:8000",
      locationHref: "https://leetcode.com/problems/two-sum/",
      problem: null,
      nowMs: 1_800_000_000_000
    });

    expect(captureLatestCodeSnapshot).toHaveBeenCalledTimes(1);
    expect(fetchClientSecret).toHaveBeenCalledTimes(1);
    expect(createRealtimeSession).toHaveBeenCalledTimes(1);
    expect(session.start).toHaveBeenCalledTimes(1);
    expect(captureLatestCodeSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      fetchClientSecret.mock.invocationCallOrder[0]
    );
  });

  it("continues starting the session when the pre-start capture fails", async () => {
    const captureLatestCodeSnapshot = vi.fn().mockRejectedValue(new Error("capture failed"));
    const fetchClientSecret = vi.fn().mockResolvedValue({
      value: "ek_123",
      expires_at: 1_900_000_000,
      session: {
        id: "sess_123",
        model: "gpt-realtime",
        object: "realtime.session",
        type: "realtime"
      }
    });
    const session = { start: vi.fn().mockResolvedValue(undefined) };

    const result = await startInterviewSessionAttempt({
      captureLatestCodeSnapshot,
      fetchClientSecret,
      createRealtimeSession: () => session,
      getAuthHeader: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
      apiBaseUrl: "http://localhost:8000",
      locationHref: "https://leetcode.com/problems/two-sum/",
      problem: null,
      nowMs: 1_800_000_000_000
    });

    expect(fetchClientSecret).toHaveBeenCalledTimes(1);
    expect(session.start).toHaveBeenCalledTimes(1);
    expect(result.remainingSeconds).toBe(100_000_000);
  });
});

describe("LauncherButton", () => {
  it("renders the icon-based launcher content instead of the legacy L glyph", () => {
    const html = renderToStaticMarkup(
      createElement(LauncherButton, {
        isExpanded: false,
        onClick: () => undefined,
        palette: {
          buttonBackground: "#020617",
          buttonBorder: "#334155",
          buttonText: "#e2e8f0"
        }
      })
    );

    expect(html).toContain("aria-label=\"Open Loop interviewer\"");
    expect(html).toContain("data-app-icon=\"true\"");
    expect(html).not.toContain(">L<");
  });
});
