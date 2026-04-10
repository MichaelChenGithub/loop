import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE,
  type CaptureLatestCodeSnapshotResponse,
  type LatestCodeSnapshot
} from "../code-snapshot";

let latestCodeSnapshot: LatestCodeSnapshot | null = null;

type RuntimeLike = Pick<typeof chrome.runtime, "onMessage">;
type SendPageMessage = (
  tabId: number,
  message: { type: typeof READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE }
) => Promise<LatestCodeSnapshot | null>;

export const getLatestCodeSnapshot = (): LatestCodeSnapshot | null =>
  latestCodeSnapshot;

export const setLatestCodeSnapshot = (
  snapshot: LatestCodeSnapshot
): LatestCodeSnapshot => {
  latestCodeSnapshot = snapshot;
  return snapshot;
};

export const clearLatestCodeSnapshot = (): void => {
  latestCodeSnapshot = null;
};

export const installBackgroundMessageHandlers = ({
  runtime = chrome.runtime,
  sendPageMessage = (tabId, message) =>
    chrome.tabs.sendMessage(tabId, message) as Promise<LatestCodeSnapshot | null>
}: {
  runtime?: RuntimeLike;
  sendPageMessage?: SendPageMessage;
} = {}): void => {
  // Keep the canonical snapshot here so future Realtime tool calling can read
  // from background instead of depending on page-local React/content-script state.
  runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type !== CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE) {
      return undefined;
    }

    const tabId = sender.tab?.id;

    if (typeof tabId !== "number") {
      return { snapshot: null } satisfies CaptureLatestCodeSnapshotResponse;
    }

    const snapshot = await sendPageMessage(tabId, {
      type: READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE
    });

    if (snapshot) {
      setLatestCodeSnapshot(snapshot);
      console.log("[loop] latest code snapshot", snapshot);
    }

    return { snapshot } satisfies CaptureLatestCodeSnapshotResponse;
  });
};

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  installBackgroundMessageHandlers();
}
