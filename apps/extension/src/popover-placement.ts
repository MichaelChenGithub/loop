import type { RectLike, ViewportSize } from "./toolbar-anchor";

type PopoverSize = {
  width: number;
  height: number;
};

export type PopoverPlacement = {
  top: number;
  left: number;
  transformOrigin: "top right" | "top left" | "bottom right" | "bottom left";
};

const VIEWPORT_PADDING = 16;
const POPOVER_GAP = 8;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export const computePopoverPlacement = (
  anchorRect: RectLike,
  popoverSize: PopoverSize,
  viewport: ViewportSize
): PopoverPlacement => {
  const fitsBelow =
    anchorRect.bottom + POPOVER_GAP + popoverSize.height <=
    viewport.height - VIEWPORT_PADDING;
  const fitsRightAligned = anchorRect.right - popoverSize.width >= VIEWPORT_PADDING;
  const top = fitsBelow
    ? anchorRect.bottom + POPOVER_GAP
    : anchorRect.top - popoverSize.height - POPOVER_GAP;
  const unclampedLeft = fitsRightAligned
    ? anchorRect.right - popoverSize.width
    : anchorRect.left;

  const maxTop = Math.max(
    VIEWPORT_PADDING,
    viewport.height - popoverSize.height - VIEWPORT_PADDING
  );
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    viewport.width - popoverSize.width - VIEWPORT_PADDING
  );

  return {
    top: clamp(
      Math.round(top),
      VIEWPORT_PADDING,
      maxTop
    ),
    left: clamp(
      Math.round(unclampedLeft),
      VIEWPORT_PADDING,
      maxLeft
    ),
    transformOrigin: fitsBelow
      ? fitsRightAligned
        ? "top right"
        : "top left"
      : fitsRightAligned
        ? "bottom right"
        : "bottom left"
  };
};
