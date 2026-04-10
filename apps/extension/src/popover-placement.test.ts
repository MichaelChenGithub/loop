import { describe, expect, it } from "vitest";

import { computePopoverPlacement } from "./popover-placement";

describe("computePopoverPlacement", () => {
  it("opens below the button and right-aligns by default", () => {
    expect(
      computePopoverPlacement(
        { top: 96, left: 1060, width: 36, height: 36, right: 1096, bottom: 132 },
        { width: 336, height: 292 },
        { width: 1440, height: 900 }
      )
    ).toEqual({
      top: 140,
      left: 760,
      transformOrigin: "top right"
    });
  });

  it("flips inward when the popover would overflow the viewport", () => {
    expect(
      computePopoverPlacement(
        { top: 760, left: 12, width: 36, height: 36, right: 48, bottom: 796 },
        { width: 336, height: 292 },
        { width: 360, height: 820 }
      )
    ).toEqual({
      top: 460,
      left: 16,
      transformOrigin: "bottom left"
    });
  });
});
