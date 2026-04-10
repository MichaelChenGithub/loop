import type { PlasmoCSConfig } from "plasmo";

import { InterviewOverlay } from "../InterviewOverlay";
import {
  INITIAL_OVERLAY_SYNC_DELAYS_MS,
  needsOverlayBootstrapRetry
} from "../overlay-bootstrap";
import { LOOP_NAVIGATE_EVENT } from "../leetcode-page";
import { shouldMountInterviewOverlay } from "../overlay-visibility";

const HOST_ID = "loop-interviewer-host";
const ROOT_ID = "loop-interviewer-root";

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*", "https://www.leetcode.com/*"]
};

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

  return host;
};

const mountOverlay = () => {
  if (
    !document.body ||
    !shouldMountInterviewOverlay(new URL(window.location.href), document)
  ) {
    return;
  }

  const host = createHost();
  const rootContainer = host.shadowRoot?.getElementById(ROOT_ID);

  if (!(rootContainer instanceof HTMLDivElement)) {
    return;
  }

  if (!overlayRoot) {
    overlayRoot = createRoot(rootContainer);
  }

  overlayRoot.render(<InterviewOverlay />);
};

const unmountOverlay = () => {
  overlayRoot?.unmount();
  overlayRoot = null;
  document.getElementById(HOST_ID)?.remove();
};

const syncOverlay = () => {
  const currentUrl = window.location.href;
  const shouldMount = shouldMountInterviewOverlay(new URL(currentUrl), document);

  if (shouldMount) {
    mountOverlay();
  } else {
    unmountOverlay();
  }
};

const startOverlayLifecycle = () => {
  if (!document.body) {
    window.requestAnimationFrame(startOverlayLifecycle);
    return;
  }

  const observer = new MutationObserver(() => {
    syncOverlay();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  syncOverlay();

  window.addEventListener("popstate", syncOverlay);
  window.addEventListener("hashchange", syncOverlay);
  document.addEventListener("DOMContentLoaded", syncOverlay);
  window.addEventListener("load", syncOverlay);
  document.addEventListener("readystatechange", syncOverlay);

  INITIAL_OVERLAY_SYNC_DELAYS_MS.forEach((delayMs) => {
    window.setTimeout(() => {
      if (
        needsOverlayBootstrapRetry({
          hostExists: Boolean(document.getElementById(HOST_ID)),
          mountRequested: shouldMountInterviewOverlay(
            new URL(window.location.href),
            document
          )
        })
      ) {
        syncOverlay();
      }
    }, delayMs);
  });

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new CustomEvent(LOOP_NAVIGATE_EVENT));
    syncOverlay();
  };

  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new CustomEvent(LOOP_NAVIGATE_EVENT));
    syncOverlay();
  };
};

export default InterviewOverlay;
