import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE,
  type LatestCodeSnapshot
} from "../code-snapshot";
import {
  clearLatestCodeSnapshot,
  getLatestCodeSnapshot,
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
});

describe("installBackgroundMessageHandlers", () => {
  beforeEach(() => {
    clearLatestCodeSnapshot();
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

    const response = await listener(
      { type: CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE },
      { tab: { id: 12 } }
    );

    expect(sendPageMessage).toHaveBeenCalledWith(12, {
      type: READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE
    });
    expect(response).toEqual({ snapshot: makeSnapshot("print('captured')") });
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

    const response = await listener(
      { type: CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE },
      { tab: { id: 12 } }
    );

    expect(response).toEqual({ snapshot: null });
    expect(getLatestCodeSnapshot()).toEqual(existingSnapshot);
  });
});
