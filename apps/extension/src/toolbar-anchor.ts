import { LAYOUT_MANAGER_BUTTON_ID } from "./overlay-visibility";

export type ViewportSize = {
  width: number;
  height: number;
};

export type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type ToolbarAnchorCandidate = {
  rect: RectLike;
  visibleButtonCount: number;
  containsAvatar: boolean;
};

export type ToolbarAnchorPlacement = {
  top: number;
  left: number;
};

export type ToolbarAnchorResult = {
  mode: "toolbar" | "fallback";
  buttonRect: RectLike;
  clusterRect: RectLike | null;
};

export const TOOLBAR_BUTTON_SIZE = 36;
const TOOLBAR_BUTTON_GAP = 8;
const FALLBACK_RIGHT_OFFSET = 132;
const FALLBACK_TOP = 88;

const toRectLike = (rect: DOMRect | RectLike): RectLike => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height,
  right: rect.right,
  bottom: rect.bottom
});

const isVisibleElement = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0
  );
};

const isToolbarButton = (element: HTMLElement, viewport: ViewportSize) => {
  const rect = element.getBoundingClientRect();

  return (
    isVisibleElement(element) &&
    rect.top >= 40 &&
    rect.bottom <= 220 &&
    rect.left >= viewport.width * 0.48 &&
    rect.width >= 24 &&
    rect.width <= 80 &&
    rect.height >= 24 &&
    rect.height <= 80
  );
};

const isToolbarCluster = (element: HTMLElement, viewport: ViewportSize) => {
  const rect = element.getBoundingClientRect();

  return (
    rect.top >= 40 &&
    rect.bottom <= 220 &&
    rect.left >= viewport.width * 0.42 &&
    rect.width >= 84 &&
    rect.width <= Math.min(viewport.width * 0.34, 360) &&
    rect.height >= 28 &&
    rect.height <= 84
  );
};

const collectToolbarAnchorCandidates = (
  doc: Document,
  viewport: ViewportSize
): ToolbarAnchorCandidate[] => {
  const toolbarButtons = Array.from(
    doc.querySelectorAll<HTMLElement>("button, [role='button']")
  ).filter((element) => {
    if (element.closest("#loop-interviewer-host")) {
      return false;
    }

    return isToolbarButton(element, viewport);
  });

  const candidates: ToolbarAnchorCandidate[] = [];
  const seen = new Set<HTMLElement>();

  for (const button of toolbarButtons) {
    let current = button.parentElement;
    let depth = 0;

    while (current && depth < 5) {
      if (!seen.has(current) && isToolbarCluster(current, viewport)) {
        const visibleButtonCount = toolbarButtons.filter((toolbarButton) =>
          current?.contains(toolbarButton)
        ).length;

        if (visibleButtonCount >= 2) {
          candidates.push({
            rect: toRectLike(current.getBoundingClientRect()),
            visibleButtonCount,
            containsAvatar: Boolean(
              current.querySelector(
                "img, [class*='avatar'], [class*='Avatar'], [class*='user']"
              )
            )
          });
          seen.add(current);
        }
      }

      current = current.parentElement;
      depth += 1;
    }
  }

  return candidates;
};

const scoreToolbarAnchorCandidate = (
  candidate: ToolbarAnchorCandidate,
  viewport: ViewportSize
) => {
  const rightBias = candidate.rect.right / viewport.width;
  const topBias = Math.abs(candidate.rect.top - 96);

  return (
    candidate.visibleButtonCount * 20 +
    rightBias * 16 -
    topBias * 0.35 -
    (candidate.containsAvatar ? 26 : 0)
  );
};

export const pickBestToolbarAnchorCandidate = (
  candidates: ToolbarAnchorCandidate[],
  viewport: ViewportSize
): ToolbarAnchorCandidate | null => {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort(
    (left, right) =>
      scoreToolbarAnchorCandidate(right, viewport) -
      scoreToolbarAnchorCandidate(left, viewport)
  )[0];
};

export const placeToolbarButton = (
  clusterRect: RectLike,
  viewport: ViewportSize
): ToolbarAnchorPlacement => {
  const left = clusterRect.left - TOOLBAR_BUTTON_SIZE - TOOLBAR_BUTTON_GAP;
  const top = clusterRect.top + (clusterRect.height - TOOLBAR_BUTTON_SIZE) / 2;

  if (left < 16) {
    return createFallbackToolbarAnchor(viewport);
  }

  return {
    left: Math.round(left),
    top: Math.round(top)
  };
};

export const createFallbackToolbarAnchor = (
  viewport: ViewportSize
): ToolbarAnchorPlacement => ({
  top: FALLBACK_TOP,
  left: Math.max(16, viewport.width - FALLBACK_RIGHT_OFFSET)
});

export const createButtonRect = (
  placement: ToolbarAnchorPlacement
): RectLike => ({
  top: placement.top,
  left: placement.left,
  width: TOOLBAR_BUTTON_SIZE,
  height: TOOLBAR_BUTTON_SIZE,
  right: placement.left + TOOLBAR_BUTTON_SIZE,
  bottom: placement.top + TOOLBAR_BUTTON_SIZE
});

export const resolveToolbarAnchor = (
  doc: Document,
  viewport: ViewportSize
): ToolbarAnchorResult => {
  const layoutManagerControl = doc.getElementById(LAYOUT_MANAGER_BUTTON_ID);
  const preferredAnchor =
    layoutManagerControl instanceof HTMLElement
      ? ((layoutManagerControl.closest("button, [role='button']") ??
          layoutManagerControl) as HTMLElement)
      : null;

  if (preferredAnchor && isVisibleElement(preferredAnchor)) {
    const preferredRect = toRectLike(preferredAnchor.getBoundingClientRect());

    return {
      mode: "toolbar",
      buttonRect: createButtonRect(placeToolbarButton(preferredRect, viewport)),
      clusterRect: preferredRect
    };
  }

  const candidates = collectToolbarAnchorCandidates(doc, viewport);
  const cluster = pickBestToolbarAnchorCandidate(candidates, viewport);

  if (!cluster) {
    return {
      mode: "fallback",
      buttonRect: createButtonRect(createFallbackToolbarAnchor(viewport)),
      clusterRect: null
    };
  }

  return {
    mode: "toolbar",
    buttonRect: createButtonRect(placeToolbarButton(cluster.rect, viewport)),
    clusterRect: cluster.rect
  };
};
