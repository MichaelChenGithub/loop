import { describe, expect, it, vi } from "vitest";

import type { LatestCodeSnapshot } from "./code-snapshot";
import {
  createRealtimeToolDispatcher,
  readCurrentCodeContextFromBackground
} from "./realtime-tool-dispatch";

const makeSnapshot = (overrides: Partial<LatestCodeSnapshot> = {}): LatestCodeSnapshot => ({
  language: "python3",
  code: "print('captured')",
  updatedAt: "2026-04-10T15:30:00.000Z",
  source: "leetcode-editor",
  problemSlug: "two-sum",
  ...overrides
});

describe("readCurrentCodeContextFromBackground", () => {
  it("returns an available payload when background has a snapshot", async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      snapshot: makeSnapshot()
    });

    await expect(
      readCurrentCodeContextFromBackground({
        runtime: { sendMessage } as never
      })
    ).resolves.toEqual({
      available: true,
      code: "print('captured')",
      language: "python3",
      problemSlug: "two-sum",
      capturedAt: "2026-04-10T15:30:00.000Z",
      source: "leetcode-editor"
    });
  });

  it("returns a structured empty payload when background has no snapshot", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ snapshot: null });

    await expect(
      readCurrentCodeContextFromBackground({
        runtime: { sendMessage } as never
      })
    ).resolves.toEqual({
      available: false,
      code: null,
      language: null,
      problemSlug: null,
      capturedAt: null,
      source: null
    });
  });
});

describe("createRealtimeToolDispatcher", () => {
  it("dispatches get_current_code_context to the background reader", async () => {
    const readCurrentCodeContext = vi.fn().mockResolvedValue({
      available: true,
      code: "print('captured')",
      language: "python3",
      problemSlug: "two-sum",
      capturedAt: "2026-04-10T15:30:00.000Z",
      source: "leetcode-editor"
    });

    const dispatcher = createRealtimeToolDispatcher({
      readCurrentCodeContext
    });

    await expect(
      dispatcher.dispatch({
        name: "get_current_code_context",
        arguments: {}
      })
    ).resolves.toEqual({
      available: true,
      code: "print('captured')",
      language: "python3",
      problemSlug: "two-sum",
      capturedAt: "2026-04-10T15:30:00.000Z",
      source: "leetcode-editor"
    });
  });

  it("returns a safe failure result for an unknown tool", async () => {
    const dispatcher = createRealtimeToolDispatcher({
      readCurrentCodeContext: vi.fn()
    });

    await expect(
      dispatcher.dispatch({
        name: "unexpected_tool",
        arguments: {}
      })
    ).resolves.toEqual({
      ok: false,
      error: "Unknown tool: unexpected_tool"
    });
  });
});
