import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  type CaptureLatestCodeSnapshotResponse
} from "./code-snapshot";

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
