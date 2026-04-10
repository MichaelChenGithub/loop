import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE,
  type CaptureLatestCodeSnapshotResponse,
  type LatestCodeSnapshot
} from "../code-snapshot";

export type CurrentCodeContextToolOutput = {
  code: string;
  language: string | null;
  problemSlug: string | null;
  capturedAt: string;
  source: "leetcode-editor";
};

let latestCodeSnapshot: LatestCodeSnapshot | null = null;

type RuntimeLike = Pick<typeof chrome.runtime, "onMessage">;
type MessageResponder = (response: CaptureLatestCodeSnapshotResponse) => void;
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

export const buildCurrentCodeContextToolOutput = (
  snapshot: LatestCodeSnapshot
): CurrentCodeContextToolOutput => ({
  code: snapshot.code,
  language: snapshot.language,
  problemSlug: snapshot.problemSlug,
  capturedAt: snapshot.updatedAt,
  source: snapshot.source
});

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
  runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE) {
      return undefined;
    }

    const tabId = sender.tab?.id;

    if (typeof tabId !== "number") {
      (sendResponse as MessageResponder)({
        snapshot: null
      } satisfies CaptureLatestCodeSnapshotResponse);
      return false;
    }

    void sendPageMessage(tabId, {
      type: READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE
    }).then((snapshot) => {
      if (snapshot) {
        setLatestCodeSnapshot(snapshot);
        console.log("[loop] latest code snapshot", snapshot);
      }

      (sendResponse as MessageResponder)({
        snapshot
      } satisfies CaptureLatestCodeSnapshotResponse);
    });

    return true;
  });
};

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  installBackgroundMessageHandlers();
}
