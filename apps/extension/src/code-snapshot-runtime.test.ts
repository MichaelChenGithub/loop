import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE
} from "./code-snapshot";
import {
  captureLatestCodeSnapshot,
  installLatestCodeSnapshotPageReader
} from "./code-snapshot-runtime";

describe("captureLatestCodeSnapshot", () => {
  it("requests a background capture", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ snapshot: null });

    const result = await captureLatestCodeSnapshot({
      runtime: { sendMessage } as never
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE
    });
    expect(result).toEqual({ snapshot: null });
  });
});

describe("installLatestCodeSnapshotPageReader", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the current LeetCode page snapshot when background requests it", async () => {
    const addListener = vi.fn();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          href: "https://leetcode.com/problems/two-sum/"
        }
      }
    });

    installLatestCodeSnapshotPageReader({
      runtime: {
        onMessage: { addListener }
      } as never,
      doc: {
        querySelector: (selector: string) => {
          if (selector === '[data-mode-id]') {
            return {
              textContent: "",
              dataset: { modeId: "python3" }
            } as unknown as Element;
          }

          if (selector === ".monaco-editor textarea, .monaco-editor [data-testid=\"code-area\"] textarea") {
            return {
              value: "class Solution:\n    pass",
              textContent: "class Solution:\n    pass"
            } as unknown as Element;
          }

          return null;
        },
        querySelectorAll: () => []
      } as never,
      getNowIsoString: () => "2026-04-10T15:30:00.000Z"
    });

    const listener = addListener.mock.calls[0]?.[0];
    const response = await listener({
      type: READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE
    });

    expect(response).toEqual({
      language: "python3",
      code: "class Solution:\n    pass",
      updatedAt: "2026-04-10T15:30:00.000Z",
      source: "leetcode-editor",
      problemSlug: "two-sum"
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  });
});
