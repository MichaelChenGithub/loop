import { describe, expect, it } from "vitest";

import { shouldShowCodeCaptureDebugAction } from "./debug-controls";

describe("shouldShowCodeCaptureDebugAction", () => {
  it("shows the debug capture action outside production", () => {
    expect(shouldShowCodeCaptureDebugAction("development")).toBe(true);
    expect(shouldShowCodeCaptureDebugAction("test")).toBe(true);
  });

  it("hides the debug capture action in production", () => {
    expect(shouldShowCodeCaptureDebugAction("production")).toBe(false);
  });
});
