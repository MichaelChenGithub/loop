import type { PlasmoCSConfig } from "plasmo";
import { createRoot, type Root } from "react-dom/client";

import { InterviewOverlay } from "../InterviewOverlay";
import {
  INITIAL_OVERLAY_SYNC_DELAYS_MS,
  needsOverlayBootstrapRetry
} from "../overlay-bootstrap";
import { shouldMountInterviewOverlay } from "../overlay-visibility";

const HOST_ID = "loop-interviewer-host";
const ROOT_ID = "loop-interviewer-root";

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*", "https://www.leetcode.com/*"]
};

let overlayRoot: Root | null = null;

const createHost = (): HTMLDivElement => {
  const existingHost = document.getElementById(HOST_ID);

  if (existingHost instanceof HTMLDivElement) {
    return existingHost;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }

    #${ROOT_ID} {
      position: static;
      width: 0;
      height: 0;
      pointer-events: none;
    }
  `;

  const rootContainer = document.createElement("div");
  rootContainer.id = ROOT_ID;

  shadowRoot.append(style, rootContainer);
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
    syncOverlay();
  };

  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    syncOverlay();
  };
};

startOverlayLifecycle();
