export const INITIAL_OVERLAY_SYNC_DELAYS_MS = [0, 50, 150, 300, 800, 1500, 3000];

export const needsOverlayBootstrapRetry = ({
  hostExists,
  mountRequested
}: {
  hostExists: boolean;
  mountRequested: boolean;
}): boolean => mountRequested && !hostExists;
