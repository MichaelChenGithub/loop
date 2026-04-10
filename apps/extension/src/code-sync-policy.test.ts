import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CODE_SYNC_IDLE_DEBOUNCE_MS,
  createIdleCodeSyncController
} from "./code-sync-policy";

describe("createIdleCodeSyncController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("captures once after the user has been idle for 3000ms", async () => {
    const capture = vi.fn().mockResolvedValue(undefined);
    const controller = createIdleCodeSyncController({ capture });

    controller.notifyEditorActivity();
    await vi.advanceTimersByTimeAsync(CODE_SYNC_IDLE_DEBOUNCE_MS - 1);
    expect(capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("resets the debounce timer when new editor activity arrives", async () => {
    const capture = vi.fn().mockResolvedValue(undefined);
    const controller = createIdleCodeSyncController({ capture });

    controller.notifyEditorActivity();
    await vi.advanceTimersByTimeAsync(CODE_SYNC_IDLE_DEBOUNCE_MS - 1000);
    controller.notifyEditorActivity();
    await vi.advanceTimersByTimeAsync(CODE_SYNC_IDLE_DEBOUNCE_MS - 1000);
    expect(capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("does not capture when the session is not connected", async () => {
    const capture = vi.fn().mockResolvedValue(undefined);
    const controller = createIdleCodeSyncController({
      capture,
      initialSessionStatus: "idle"
    });

    controller.notifyEditorActivity();
    await vi.advanceTimersByTimeAsync(CODE_SYNC_IDLE_DEBOUNCE_MS);

    expect(capture).not.toHaveBeenCalled();
  });

  it("cancels any pending capture when the session leaves connected", async () => {
    const capture = vi.fn().mockResolvedValue(undefined);
    const controller = createIdleCodeSyncController({ capture });

    controller.notifyEditorActivity();
    await vi.advanceTimersByTimeAsync(300);
    controller.setSessionStatus("ended");
    await vi.advanceTimersByTimeAsync(CODE_SYNC_IDLE_DEBOUNCE_MS);

    expect(capture).not.toHaveBeenCalled();
  });
});
