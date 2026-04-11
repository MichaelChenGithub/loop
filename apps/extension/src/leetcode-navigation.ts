import { LOOP_NAVIGATE_EVENT, type LeetCodeProblem } from "./leetcode-page";

export type NavigationSyncResult = {
  didProblemChange: boolean;
  problem: LeetCodeProblem | null;
  slug: string | null;
};

export const createLeetCodeNavigationCoordinator = ({
  initialSyncDelaysMs,
  syncProblem,
  pollIntervalMs = 250
}: {
  initialSyncDelaysMs: number[];
  syncProblem: () => NavigationSyncResult;
  pollIntervalMs?: number;
}) => {
  let timeoutIds: number[] = [];
  let pollIntervalId = 0;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  let lastKnownHref = window.location.href;

  const clearPendingSyncs = () => {
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds = [];
  };

  const runScheduledSyncs = () => {
    clearPendingSyncs();

    let hasObservedProblemChange = syncProblem().didProblemChange;

    if (hasObservedProblemChange) {
      return;
    }

    timeoutIds = initialSyncDelaysMs.map((delay) =>
      window.setTimeout(() => {
        if (hasObservedProblemChange) {
          return;
        }

        hasObservedProblemChange = syncProblem().didProblemChange;
      }, delay)
    );
  };

  const handleNavigation = () => {
    lastKnownHref = window.location.href;
    window.dispatchEvent(new Event(LOOP_NAVIGATE_EVENT));
    runScheduledSyncs();
  };

  history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    handleNavigation();
  };

  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    handleNavigation();
  };

  window.addEventListener("popstate", handleNavigation);
  pollIntervalId = window.setInterval(() => {
    if (window.location.href === lastKnownHref) {
      return;
    }

    handleNavigation();
  }, pollIntervalMs);

  return {
    syncNow() {
      syncProblem();
    },
    dispose() {
      clearPendingSyncs();
      if (pollIntervalId) {
        window.clearInterval(pollIntervalId);
      }
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handleNavigation);
    }
  };
};
