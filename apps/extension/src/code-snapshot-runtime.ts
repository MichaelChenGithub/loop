import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE,
  type CaptureLatestCodeSnapshotResponse
} from "./code-snapshot";
import {
  extractLatestCodeSnapshotFromLeetCodeEditor,
  type EditorQueryableDocument
} from "./leetcode-editor";

type RuntimeLike = Pick<typeof chrome.runtime, "sendMessage" | "onMessage">;
type MessageResponder = (response: unknown) => void;

export const captureLatestCodeSnapshot = async ({
  runtime = chrome.runtime
}: {
  runtime?: Pick<typeof chrome.runtime, "sendMessage">;
} = {}): Promise<CaptureLatestCodeSnapshotResponse> => {
  const response = (await runtime.sendMessage({
    type: CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE
  })) as CaptureLatestCodeSnapshotResponse;

  console.log("[loop] captureLatestCodeSnapshot response", response);

  return response;
};

export const installLatestCodeSnapshotPageReader = ({
  runtime = chrome.runtime,
  doc = document as unknown as EditorQueryableDocument,
  getLocationHref = () => window.location.href,
  getNowIsoString = () => new Date().toISOString()
}: {
  runtime?: RuntimeLike;
  doc?: EditorQueryableDocument;
  getLocationHref?: () => string;
  getNowIsoString?: () => string;
} = {}): void => {
  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE) {
      return undefined;
    }

    const snapshot = extractLatestCodeSnapshotFromLeetCodeEditor(
      doc,
      new URL(getLocationHref()),
      getNowIsoString
    );

    console.log("[loop] page code snapshot", snapshot);

    (sendResponse as MessageResponder)(snapshot);
    return true;
  });
};
