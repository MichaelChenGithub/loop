import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getAnchorWrapperStyle,
  LauncherButton,
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

describe("LauncherButton", () => {
  it("renders the icon-based launcher content instead of the legacy L glyph", () => {
    const html = renderToStaticMarkup(
      createElement(LauncherButton, {
        isExpanded: false,
        onClick: () => undefined,
        palette: {
          buttonBackground: "#020617",
          buttonBorder: "#334155",
          buttonText: "#e2e8f0"
        }
      })
    );

    expect(html).toContain("aria-label=\"Open Loop interviewer\"");
    expect(html).toContain("data-app-icon=\"true\"");
    expect(html).not.toContain(">L<");
  });
});
