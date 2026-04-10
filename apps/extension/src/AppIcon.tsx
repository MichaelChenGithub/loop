import type { CSSProperties } from "react";

const mobiusIconUrl = new URL("../assets/mobius.png", import.meta.url).href;

export const AppIcon = ({
  size = 20,
  decorative = true,
  label = "Loop Mobius icon",
  style
}: {
  size?: number;
  decorative?: boolean;
  label?: string;
  style?: CSSProperties;
}) => (
  <img
    alt={decorative ? "" : label}
    aria-hidden={decorative}
    data-app-icon="true"
    height={size}
    src={mobiusIconUrl}
    style={{
      display: "block",
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      flexShrink: 0,
      ...style
    }}
    width={size}
  />
);
