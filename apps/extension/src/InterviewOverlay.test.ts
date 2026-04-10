import { describe, expect, it } from "vitest";

import {
  getAnchorWrapperStyle,
  resolvePanelAnchorRect,
  resolvePageTone
} from "./InterviewOverlay";

describe("resolvePageTone", () => {
  it("falls back to the document background when the body background is transparent", () => {
    expect(resolvePageTone("rgba(0, 0, 0, 0)", "rgb(255, 255, 255)")).toBe("light");
  });

  it("uses the body background when it is opaque", () => {
    expect(resolvePageTone("rgb(15, 23, 42)", "rgb(255, 255, 255)")).toBe("dark");
  });
});

describe("getAnchorWrapperStyle", () => {
  it("reserves the shared button-height slot so the collapsed toolbar stays vertically centered", () => {
    expect(getAnchorWrapperStyle({ top: 92, right: 1180 }, 1440)).toMatchObject({
      top: "92px",
      right: "260px",
      height: "36px"
    });
  });
});

describe("resolvePanelAnchorRect", () => {
  it("anchors the expanded panel to the live collapsed toolbar when it is available", () => {
    expect(
      resolvePanelAnchorRect(
        {
          top: 88,
          left: 1000,
          width: 180,
          height: 36,
          right: 1180,
          bottom: 124
        },
        {
          top: 92,
          left: 1144,
          width: 36,
          height: 36,
          right: 1180,
          bottom: 128
        }
      )
    ).toMatchObject({
      left: 1000,
      width: 180,
      right: 1180
    });
  });
});
