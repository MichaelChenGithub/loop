import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Popup from "./popup";

describe("Popup", () => {
  it("renders the Mobius brand mark in the popup header", () => {
    const html = renderToStaticMarkup(createElement(Popup));

    expect(html).toContain("Loop Extension");
    expect(html).toContain("data-app-icon=\"true\"");
  });
});
