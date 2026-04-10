export type LatestCodeSnapshot = {
  language: string | null;
  code: string;
  updatedAt: string;
  source: "leetcode-editor";
  problemSlug: string | null;
};

export const CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE =
  "loop:capture-latest-code-snapshot";

export const GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE =
  "loop:get-latest-code-snapshot";

export const READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE =
  "loop:read-latest-code-snapshot-from-page";

export type CaptureLatestCodeSnapshotMessage = {
  type: typeof CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE;
};

export type ReadLatestCodeSnapshotFromPageMessage = {
  type: typeof READ_LATEST_CODE_SNAPSHOT_FROM_PAGE_MESSAGE_TYPE;
};

export type GetLatestCodeSnapshotMessage = {
  type: typeof GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE;
};

export type CaptureLatestCodeSnapshotResponse = {
  snapshot: LatestCodeSnapshot | null;
};

export type GetLatestCodeSnapshotResponse = CaptureLatestCodeSnapshotResponse;
