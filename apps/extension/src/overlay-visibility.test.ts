import { describe, expect, it } from "vitest";

import {
  LAYOUT_MANAGER_BUTTON_ID,
  hasLeetCodeToolbarAnchor,
  shouldMountInterviewOverlay
} from "./overlay-visibility";

const createDocumentStub = (buttonPresent: boolean) =>
  ({
    getElementById: (id: string) =>
      buttonPresent && id === LAYOUT_MANAGER_BUTTON_ID ? {} : null
  }) as Pick<Document, "getElementById">;

describe("hasLeetCodeToolbarAnchor", () => {
  it("returns true when the layout manager button exists", () => {
    expect(hasLeetCodeToolbarAnchor(createDocumentStub(true))).toBe(true);
  });

  it("returns false when the layout manager button is absent", () => {
    expect(hasLeetCodeToolbarAnchor(createDocumentStub(false))).toBe(false);
  });
});

describe("shouldMountInterviewOverlay", () => {
  it("mounts on LeetCode problem route variants when the toolbar anchor exists", () => {
    expect(
      shouldMountInterviewOverlay(
        new URL("https://leetcode.com/problems/two-sum/description/"),
        createDocumentStub(true)
      )
    ).toBe(true);
  });

  it("does not mount when the toolbar anchor is missing", () => {
    expect(
      shouldMountInterviewOverlay(
        new URL("https://leetcode.com/problems/two-sum/"),
        createDocumentStub(false)
      )
    ).toBe(false);
  });

  it("does not mount on non-LeetCode hosts even if the anchor id exists", () => {
    expect(
      shouldMountInterviewOverlay(
        new URL("https://example.com/problems/two-sum/"),
        createDocumentStub(true)
      )
    ).toBe(false);
  });
});
