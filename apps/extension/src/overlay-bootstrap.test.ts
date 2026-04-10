import { describe, expect, it } from "vitest";

import { needsOverlayBootstrapRetry } from "./overlay-bootstrap";

describe("needsOverlayBootstrapRetry", () => {
  it("retries while a mount target exists but the host has not been created yet", () => {
    expect(
      needsOverlayBootstrapRetry({
        hostExists: false,
        mountRequested: true
      })
    ).toBe(true);
  });

  it("does not retry once the host exists", () => {
    expect(
      needsOverlayBootstrapRetry({
        hostExists: true,
        mountRequested: true
      })
    ).toBe(false);
  });

  it("does not retry when the page no longer requests the overlay", () => {
    expect(
      needsOverlayBootstrapRetry({
        hostExists: false,
        mountRequested: false
      })
    ).toBe(false);
  });
});
