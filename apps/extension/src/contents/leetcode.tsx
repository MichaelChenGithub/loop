import type { PlasmoCSConfig } from "plasmo";

import { InterviewOverlay } from "../InterviewOverlay";
import { installLatestCodeSnapshotPageReader } from "../code-snapshot-runtime";

const HOST_ID = "loop-interviewer-host";
const ROOT_ID = "loop-interviewer-root";

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*", "https://www.leetcode.com/*"]
};

installLatestCodeSnapshotPageReader();

export const getRootContainer = (): HTMLElement => {
  const existing = document.getElementById(HOST_ID);

  if (existing instanceof HTMLDivElement) {
    return existing.shadowRoot!.getElementById(ROOT_ID) as HTMLElement;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    #${ROOT_ID} { position: static; width: 0; height: 0; pointer-events: none; }
  `;

  const container = document.createElement("div");
  container.id = ROOT_ID;

  shadow.append(style, container);
  document.body.appendChild(host);

  return container;
};

export default InterviewOverlay;
