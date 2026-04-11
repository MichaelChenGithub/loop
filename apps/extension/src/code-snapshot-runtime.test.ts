import { describe, expect, it, vi } from "vitest";

import { CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE } from "./code-snapshot";
import { captureLatestCodeSnapshot } from "./code-snapshot-runtime";

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
