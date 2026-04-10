import { describe, expect, it } from "vitest";

import {
  createButtonRect,
  createFallbackToolbarAnchor,
  placeToolbarButton,
  pickBestToolbarAnchorCandidate,
  type ToolbarAnchorCandidate
} from "./toolbar-anchor";

const candidate = (
  partial: Partial<ToolbarAnchorCandidate>
): ToolbarAnchorCandidate => ({
  rect: {
    top: 92,
    left: 1100,
    width: 180,
    height: 40,
    right: 1280,
    bottom: 132
  },
  visibleButtonCount: 4,
  containsAvatar: false,
  ...partial
});

describe("pickBestToolbarAnchorCandidate", () => {
  it("prefers the top-right utility cluster over the user controls cluster", () => {
    const result = pickBestToolbarAnchorCandidate(
      [
        candidate({ rect: { top: 92, left: 1096, width: 176, height: 40, right: 1272, bottom: 132 }, visibleButtonCount: 4 }),
        candidate({ rect: { top: 92, left: 1278, width: 82, height: 40, right: 1360, bottom: 132 }, visibleButtonCount: 2, containsAvatar: true })
      ],
      { width: 1440, height: 900 }
    );

    expect(result?.rect.left).toBe(1096);
  });

  it("returns null when no viable candidate exists", () => {
    expect(pickBestToolbarAnchorCandidate([], { width: 1440, height: 900 })).toBe(
      null
    );
  });
});

describe("placeToolbarButton", () => {
  it("places the Loop button to the left of the toolbar cluster", () => {
    expect(
      placeToolbarButton(
        candidate({ rect: { top: 94, left: 1104, width: 168, height: 40, right: 1272, bottom: 134 } }).rect,
        { width: 1440, height: 900 }
      )
    ).toEqual({
      top: 96,
      left: 1060
    });
  });

  it("places the Loop button to the left of the layout manager button", () => {
    expect(
      createButtonRect(
        placeToolbarButton(
          {
            top: 90,
            left: 1188,
            width: 40,
            height: 40,
            right: 1228,
            bottom: 130
          },
          { width: 1440, height: 900 }
        )
      )
    ).toMatchObject({
      top: 92,
      left: 1144,
      right: 1180
    });
  });
});

describe("createFallbackToolbarAnchor", () => {
  it("creates a stable right-top fallback near the native toolbar line", () => {
    expect(createFallbackToolbarAnchor({ width: 1440, height: 900 })).toEqual({
      top: 88,
      left: 1308
    });
  });
});
