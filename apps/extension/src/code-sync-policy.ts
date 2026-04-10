import type { SessionStatus } from "./state";

export const CODE_SYNC_IDLE_DEBOUNCE_MS = 3000;

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

export const createIdleCodeSyncController = ({
  capture,
  delayMs = CODE_SYNC_IDLE_DEBOUNCE_MS,
  initialSessionStatus = "connected",
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout
}: {
  capture: () => Promise<void>;
  delayMs?: number;
  initialSessionStatus?: SessionStatus;
  setTimeoutFn?: typeof globalThis.setTimeout;
  clearTimeoutFn?: typeof globalThis.clearTimeout;
}) => {
  let pendingCaptureTimeout: TimeoutHandle | null = null;
  let sessionStatus = initialSessionStatus;

  const cancelPendingCapture = () => {
    if (pendingCaptureTimeout !== null) {
      clearTimeoutFn(pendingCaptureTimeout);
      pendingCaptureTimeout = null;
    }
  };

  const setSessionStatus = (nextSessionStatus: SessionStatus) => {
    sessionStatus = nextSessionStatus;

    if (sessionStatus !== "connected") {
      cancelPendingCapture();
    }
  };

  const notifyEditorActivity = () => {
    if (sessionStatus !== "connected") {
      return;
    }

    cancelPendingCapture();
    pendingCaptureTimeout = setTimeoutFn(() => {
      pendingCaptureTimeout = null;
      void capture();
    }, delayMs);
  };

  return {
    notifyEditorActivity,
    setSessionStatus,
    cancelPendingCapture,
    dispose: cancelPendingCapture
  };
};
