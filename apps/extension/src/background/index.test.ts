import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE,
  type LatestCodeSnapshot
} from "../code-snapshot";
import {
  buildCurrentCodeContextToolOutput,
  clearLatestCodeSnapshot,
  getLatestCodeSnapshot,
  hasMeaningfulSnapshotChange,
  installBackgroundMessageHandlers,
  setLatestCodeSnapshot
} from "./index";

const makeSnapshot = (code: string): LatestCodeSnapshot => ({
  language: "python3",
  code,
  updatedAt: "2026-04-10T15:30:00.000Z",
  source: "leetcode-editor",
  problemSlug: "two-sum"
});

describe("latest code snapshot state", () => {
  beforeEach(() => {
    clearLatestCodeSnapshot();
  });

  it("stores the most recent snapshot", () => {
    const snapshot = makeSnapshot("print('first')");

    setLatestCodeSnapshot(snapshot);

    expect(getLatestCodeSnapshot()).toEqual(snapshot);
  });

  it("overwrites the previous snapshot when a new one is stored", () => {
    setLatestCodeSnapshot(makeSnapshot("print('first')"));
    const nextSnapshot = makeSnapshot("print('second')");

    setLatestCodeSnapshot(nextSnapshot);

    expect(getLatestCodeSnapshot()).toEqual(nextSnapshot);
  });

  it("does not overwrite the stored snapshot when only updatedAt changes", () => {
    const existingSnapshot = makeSnapshot("print('first')");
    setLatestCodeSnapshot(existingSnapshot);

    setLatestCodeSnapshot({
      ...existingSnapshot,
      updatedAt: "2026-04-10T15:31:00.000Z"
    });

    expect(getLatestCodeSnapshot()).toEqual(existingSnapshot);
  });
});

describe("hasMeaningfulSnapshotChange", () => {
  it("returns false when snapshots only differ by updatedAt", () => {
    const currentSnapshot = makeSnapshot("print('captured')");

    expect(
      hasMeaningfulSnapshotChange(currentSnapshot, {
        ...currentSnapshot,
        updatedAt: "2026-04-10T15:31:00.000Z"
      })
    ).toBe(false);
  });

  it("returns true when the captured code changes", () => {
    expect(
      hasMeaningfulSnapshotChange(
        makeSnapshot("print('captured')"),
        makeSnapshot("print('updated')")
      )
    ).toBe(true);
  });

  it("returns true when the problem slug changes", () => {
    expect(
      hasMeaningfulSnapshotChange(makeSnapshot("print('captured')"), {
        ...makeSnapshot("print('captured')"),
        problemSlug: "add-two-numbers"
      })
    ).toBe(true);
  });
});

describe("installBackgroundMessageHandlers", () => {
  beforeEach(() => {
    clearLatestCodeSnapshot();
    vi.restoreAllMocks();
  });

  it("requests a one-time page snapshot and stores it", async () => {
    const addListener = vi.fn();
    const sendPageMessage = vi
      .fn()
      .mockResolvedValue(makeSnapshot("print('captured')"));

    installBackgroundMessageHandlers({
      runtime: {
        onMessage: { addListener }
      } as never,
      sendPageMessage
    });

    const listener = addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      { type: CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE },
      { tab: { id: 12 } },
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        snapshot: makeSnapshot("print('captured')")
      });
    });

    expect(sendPageMessage).toHaveBeenCalledWith(12, {
      type: READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE
    });
    expect(keepChannelOpen).toBe(true);
    expect(getLatestCodeSnapshot()).toEqual(makeSnapshot("print('captured')"));
  });

  it("does not corrupt the stored snapshot when page extraction returns null", async () => {
    const addListener = vi.fn();
    const sendPageMessage = vi.fn().mockResolvedValue(null);
    const existingSnapshot = makeSnapshot("print('existing')");
    setLatestCodeSnapshot(existingSnapshot);

    installBackgroundMessageHandlers({
      runtime: {
        onMessage: { addListener }
      } as never,
      sendPageMessage
    });

    const listener = addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      { type: CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE },
      { tab: { id: 12 } },
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ snapshot: null });
    });

    expect(keepChannelOpen).toBe(true);
    expect(getLatestCodeSnapshot()).toEqual(existingSnapshot);
  });

  it("returns the stored snapshot through the read-only background message", () => {
    const addListener = vi.fn();
    const existingSnapshot = makeSnapshot("print('existing')");
    setLatestCodeSnapshot(existingSnapshot);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    installBackgroundMessageHandlers({
      runtime: {
        onMessage: { addListener }
      } as never
    });

    const listener = addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      { type: GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE },
      { tab: { id: 12 } },
      sendResponse
    );

    expect(keepChannelOpen).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith({
      snapshot: existingSnapshot
    });
    expect(logSpy).toHaveBeenNthCalledWith(1, "[loop] Realtime tool call", {
      tool: "get_current_code_context",
      available: true,
      problemSlug: "two-sum"
    });
    expect(logSpy).toHaveBeenNthCalledWith(2, "[loop] Realtime tool result", {
      tool: "get_current_code_context",
      available: true,
      problemSlug: "two-sum",
      language: "python3",
      hasCode: true,
      code: "print('existing')"
    });
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      "[loop] Realtime tool code",
      "print('existing')"
    );
  });

  it("returns null through the read-only background message when no snapshot exists", () => {
    const addListener = vi.fn();
    const sendPageMessage = vi.fn();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    installBackgroundMessageHandlers({
      runtime: {
        onMessage: { addListener }
      } as never,
      sendPageMessage
    });

    const listener = addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    const keepChannelOpen = listener(
      { type: GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE },
      { tab: { id: 12 } },
      sendResponse
    );

    expect(keepChannelOpen).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith({
      snapshot: null
    });
    expect(sendPageMessage).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenNthCalledWith(1, "[loop] Realtime tool call", {
      tool: "get_current_code_context",
      available: false,
      problemSlug: null
    });
    expect(logSpy).toHaveBeenNthCalledWith(2, "[loop] Realtime tool result", {
      tool: "get_current_code_context",
      available: false,
      problemSlug: null,
      language: null,
      hasCode: false,
      code: null
    });
    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});

describe("buildCurrentCodeContextToolOutput", () => {
  it("maps an internal snapshot to the thin tool payload", () => {
    expect(
      buildCurrentCodeContextToolOutput(makeSnapshot("print('captured')"))
    ).toEqual({
      available: true,
      code: "print('captured')",
      language: "python3",
      problemSlug: "two-sum",
      capturedAt: "2026-04-10T15:30:00.000Z",
      source: "leetcode-editor"
    });
  });

  it("preserves nullable fields in the tool payload", () => {
    expect(
      buildCurrentCodeContextToolOutput({
        language: null,
        code: "return [];",
        updatedAt: "2026-04-10T16:00:00.000Z",
        source: "leetcode-editor",
        problemSlug: null
      })
    ).toEqual({
      available: true,
      code: "return [];",
      language: null,
      problemSlug: null,
      capturedAt: "2026-04-10T16:00:00.000Z",
      source: "leetcode-editor"
    });
  });
});
