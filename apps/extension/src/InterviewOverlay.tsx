import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties
} from "react";

import { AppIcon } from "./AppIcon";
import {
  buildProblemPayloadForBackend,
  extractLeetCodeProblem,
  logLeetCodeProblemForDebug,
  LOOP_NAVIGATE_EVENT,
  type LeetCodeProblem
} from "./leetcode-page";
import { captureLatestCodeSnapshot } from "./code-snapshot-runtime";
import { shouldShowCodeCaptureDebugAction } from "./debug-controls";
import {
  CollapsedToolbar,
  ExpandedPanel,
  type OverlayPalette,
  type PageTone
} from "./overlay-ui";
import { computePopoverPlacement } from "./popover-placement";
import { fetchClientSecret, RealtimeSession } from "./realtime-session";
import {
  closePanel as closeShellPanel,
  confirmConnected,
  createInitialInterviewShellState,
  endSession,
  openPanel as openShellPanel,
  sessionFailed,
  startSession,
  tickTimer,
  toggleMute,
  type InterviewShellState
} from "./state";
import { INITIAL_OVERLAY_SYNC_DELAYS_MS } from "./overlay-bootstrap";
import {
  TOOLBAR_BUTTON_SIZE,
  resolveToolbarAnchor,
  type RectLike,
  type ToolbarAnchorResult
} from "./toolbar-anchor";
import { shouldMountInterviewOverlay } from "./overlay-visibility";

const PANEL_WIDTH = 336;
const PANEL_ESTIMATED_HEIGHT = 260;

const API_BASE_URL =
  process.env.PLASMO_PUBLIC_API_HOST ?? "http://localhost:8000";

const formatTime = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (clamped % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const getConnectionLabel = (status: InterviewShellState["sessionStatus"]) => {
  switch (status) {
    case "connected":
      return "Session connected";
    case "connecting":
      return "Session connecting";
    case "ended":
      return "Session ended";
    case "idle":
    default:
      return "Session idle";
  }
};

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight
});

const isTransparentBackground = (sample: string) => {
  const normalized = sample.trim().toLowerCase();

  return (
    normalized === "" ||
    normalized === "transparent" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized === "rgba(0,0,0,0)"
  );
};

export const resolvePageTone = (
  bodyBackgroundColor: string,
  documentBackgroundColor: string
): PageTone => {
  const sample = isTransparentBackground(bodyBackgroundColor)
    ? documentBackgroundColor
    : bodyBackgroundColor;
  const match = sample.match(/\d+/g);

  if (!match || match.length < 3) {
    return "dark";
  }

  const [red, green, blue] = match.slice(0, 3).map(Number);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance < 140 ? "dark" : "light";
};

const readPageTone = (): PageTone =>
  resolvePageTone(
    window.getComputedStyle(document.body).backgroundColor,
    window.getComputedStyle(document.documentElement).backgroundColor
  );

const difficultyColor = (
  difficulty: LeetCodeProblem["difficulty"],
  tone: PageTone
): string => {
  if (difficulty === "Easy") return tone === "dark" ? "#4ade80" : "#15803d";
  if (difficulty === "Medium") return tone === "dark" ? "#fbbf24" : "#d97706";
  if (difficulty === "Hard") return tone === "dark" ? "#f87171" : "#dc2626";
  return tone === "dark" ? "#94a3b8" : "#64748b";
};

const sameAnchor = (left: ToolbarAnchorResult, right: ToolbarAnchorResult) =>
  left.mode === right.mode &&
  left.buttonRect.top === right.buttonRect.top &&
  left.buttonRect.left === right.buttonRect.left &&
  left.buttonRect.width === right.buttonRect.width &&
  left.buttonRect.height === right.buttonRect.height;

const samePopoverPlacement = (
  left: { top: number; left: number; transformOrigin: string },
  right: { top: number; left: number; transformOrigin: string }
) =>
  left.top === right.top &&
  left.left === right.left &&
  left.transformOrigin === right.transformOrigin;

export const getAnchorWrapperStyle = (
  buttonRect: Pick<ToolbarAnchorResult["buttonRect"], "top" | "right">,
  viewportWidth: number
): CSSProperties => ({
  ...styles.anchorWrapper,
  top: `${buttonRect.top}px`,
  right: `${viewportWidth - buttonRect.right}px`
});

export const resolvePanelAnchorRect = (
  baseControlRect: RectLike | null,
  fallbackRect: RectLike
): RectLike => baseControlRect ?? fallbackRect;

export const LauncherButton = ({
  isExpanded,
  onClick,
  palette
}: {
  isExpanded: boolean;
  onClick: () => void;
  palette: {
    buttonBackground: string;
    buttonBorder: string;
    buttonText: string;
  };
}) => (
  <button
    aria-expanded={isExpanded}
    aria-label="Open Loop interviewer"
    onClick={onClick}
    style={{
      ...styles.toolbarButton,
      background: palette.buttonBackground,
      borderColor: palette.buttonBorder,
      color: palette.buttonText
    }}
    type="button">
    <AppIcon decorative size={22} />
  </button>
);

export const InterviewOverlay = () => {
  const [isVisible, setIsVisible] = useState(() =>
    shouldMountInterviewOverlay(new URL(window.location.href), document)
  );
  const [state, setState] = useState(createInitialInterviewShellState);
  const [anchor, setAnchor] = useState<ToolbarAnchorResult>(() =>
    resolveToolbarAnchor(document, getViewport())
  );
  const [viewportWidth, setViewportWidth] = useState(() => getViewport().width);
  const [pageTone, setPageTone] = useState<PageTone>(() => readPageTone());
  const [popoverPlacement, setPopoverPlacement] = useState(() =>
    computePopoverPlacement(
      anchor.buttonRect,
      {
        width: PANEL_WIDTH,
        height: PANEL_ESTIMATED_HEIGHT
      },
      getViewport()
    )
  );
  const [problem, setProblem] = useState<LeetCodeProblem | null>(null);
  const baseControlRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);

  useEffect(() => {
    let rafId = 0;

    const check = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setIsVisible(
          shouldMountInterviewOverlay(new URL(window.location.href), document)
        );
      });
    };

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("popstate", check);
    window.addEventListener("hashchange", check);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      check();
    };
    history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      check();
    };

    INITIAL_OVERLAY_SYNC_DELAYS_MS.forEach((delay) => {
      window.setTimeout(check, delay);
    });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("popstate", check);
      window.removeEventListener("hashchange", check);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const nextProblem = extractLeetCodeProblem(
        document,
        new URL(window.location.href)
      );
      logLeetCodeProblemForDebug(nextProblem, new URL(window.location.href));
      setProblem(nextProblem);
    };
    sync();
    window.addEventListener(LOOP_NAVIGATE_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(LOOP_NAVIGATE_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  useEffect(() => {
    if (state.sessionStatus !== "connected") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setState((currentState) => tickTimer(currentState));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.sessionStatus]);

  useEffect(() => {
    if (state.sessionStatus === "ended") {
      sessionRef.current?.end();
      sessionRef.current = null;
    }
  }, [state.sessionStatus]);

  useEffect(() => {
    let frameId = 0;

    const syncAnchor = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const viewport = getViewport();
        const nextAnchor = resolveToolbarAnchor(document, viewport);
        const nextTone = readPageTone();

        startTransition(() => {
          setAnchor((currentAnchor) =>
            sameAnchor(currentAnchor, nextAnchor) ? currentAnchor : nextAnchor
          );
          setViewportWidth(viewport.width);
          setPageTone(nextTone);
        });
      });
    };

    const observer = new MutationObserver(syncAnchor);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    window.addEventListener("resize", syncAnchor);
    window.addEventListener("scroll", syncAnchor, true);
    syncAnchor();

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();
      window.removeEventListener("resize", syncAnchor);
      window.removeEventListener("scroll", syncAnchor, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!state.isPanelExpanded) {
      return;
    }

    const baseControlBounds =
      baseControlRef.current instanceof HTMLElement
        ? baseControlRef.current.getBoundingClientRect()
        : null;
    const baseControlRect = baseControlBounds
      ? ({
          top: baseControlBounds.top,
          left: baseControlBounds.left,
          width: baseControlBounds.width,
          height: baseControlBounds.height,
          right: baseControlBounds.right,
          bottom: baseControlBounds.bottom
        } satisfies RectLike)
      : null;
    const popoverSize = {
      width: popoverRef.current?.offsetWidth ?? PANEL_WIDTH,
      height: popoverRef.current?.offsetHeight ?? PANEL_ESTIMATED_HEIGHT
    };
    const nextPlacement = computePopoverPlacement(
      resolvePanelAnchorRect(baseControlRect, anchor.buttonRect),
      popoverSize,
      getViewport()
    );

    setPopoverPlacement((currentPlacement) =>
      samePopoverPlacement(currentPlacement, nextPlacement)
        ? currentPlacement
        : nextPlacement
    );
  });

  useEffect(() => {
    if (!state.isPanelExpanded || state.sessionStatus === "connecting") {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const path = event.composedPath();

      if (
        (baseControlRef.current && path.includes(baseControlRef.current)) ||
        (popoverRef.current && path.includes(popoverRef.current))
      ) {
        return;
      }

      setState((currentState) => closeShellPanel(currentState));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setState((currentState) => closeShellPanel(currentState));
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isPanelExpanded, state.sessionStatus]);

  const openPanel = useCallback(() => {
    setState((currentState) => openShellPanel(currentState));
  }, []);

  const handleStart = useCallback(() => {
    setState((currentState) => {
      if (
        currentState.sessionStatus === "connecting" ||
        currentState.sessionStatus === "connected"
      ) {
        return currentState;
      }

      return startSession(currentState);
    });

    void (async () => {
      try {
        await captureLatestCodeSnapshot().catch(() => ({ snapshot: null }));
        const secret = await fetchClientSecret(
          API_BASE_URL,
          buildProblemPayloadForBackend(problem, new URL(window.location.href))
        );
        const session = new RealtimeSession();
        sessionRef.current = session;
        await session.start(secret.value, secret.session.model);
        const remainingSeconds =
          secret.expires_at - Math.floor(Date.now() / 1000);
        setState((currentState) =>
          confirmConnected(currentState, remainingSeconds)
        );
      } catch {
        sessionRef.current = null;
        setState((currentState) => sessionFailed(currentState));
      }
    })();
  }, [problem]);

  const handleEnd = useCallback(() => {
    sessionRef.current?.end();
    sessionRef.current = null;
    setState((currentState) => endSession(currentState));
  }, []);

  const handleMuteToggle = useCallback(() => {
    setState((currentState) => {
      const next = toggleMute(currentState);
      sessionRef.current?.setMuted(next.isMuted);
      return next;
    });
  }, []);

  const handleCaptureCode = useCallback(() => {
    void captureLatestCodeSnapshot().catch(() => ({ snapshot: null }));
  }, []);

  const palette =
    pageTone === "dark"
      ? {
          buttonBackground: "rgba(38, 38, 46, 0.96)",
          buttonBorder: "rgba(255, 255, 255, 0.08)",
          buttonText: "#f8fafc",
          panelBackground:
            "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
          panelBorder: "rgba(148, 163, 184, 0.18)",
          panelText: "#e5eefc",
          subtleText: "#94a3b8",
          timerBackground:
            "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(15,23,42,0.98))",
          utilityBackground: "rgba(37, 99, 235, 0.18)",
          utilityText: "#93c5fd",
          secondaryBackground: "rgba(30, 41, 59, 0.82)",
          secondaryBorder: "rgba(148, 163, 184, 0.18)"
        }
      : {
          buttonBackground: "rgba(255, 255, 255, 0.97)",
          buttonBorder: "rgba(148, 163, 184, 0.35)",
          buttonText: "#0f172a",
          panelBackground:
            "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,247,255,0.98))",
          panelBorder: "rgba(148, 163, 184, 0.28)",
          panelText: "#0f172a",
          subtleText: "#64748b",
          timerBackground:
            "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.98))",
          utilityBackground: "#dbeafe",
          utilityText: "#1d4ed8",
          secondaryBackground: "rgba(248, 250, 252, 0.92)",
          secondaryBorder: "rgba(148, 163, 184, 0.45)"
        };

  const isStartDisabled =
    state.sessionStatus === "connecting" ||
    state.sessionStatus === "connected";
  const showCodeCaptureDebugAction = shouldShowCodeCaptureDebugAction();
  const statusLabel = getConnectionLabel(state.sessionStatus);
  const timerText = formatTime(state.remainingSeconds);
  const paletteWithButton = palette as OverlayPalette & {
    buttonBackground: string;
    buttonBorder: string;
    buttonText: string;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={styles.host}>
      <div
        ref={(node) => {
          baseControlRef.current = node;
        }}
        style={getAnchorWrapperStyle(anchor.buttonRect, viewportWidth)}>
        {state.baseControlMode === "launcher" ? (
          <LauncherButton
            isExpanded={state.isPanelExpanded}
            onClick={openPanel}
            palette={paletteWithButton}
          />
        ) : (
          <CollapsedToolbar
            onEnd={handleEnd}
            onExpand={openPanel}
            onMuteToggle={handleMuteToggle}
            pageTone={pageTone}
            state={state}
            statusLabel={statusLabel}
            timerText={timerText}
          />
        )}
      </div>

      {state.isPanelExpanded ? (
        <ExpandedPanel
          ref={popoverRef}
          isStartDisabled={isStartDisabled}
          onCaptureCode={handleCaptureCode}
          onClose={() => setState((currentState) => closeShellPanel(currentState))}
          onEnd={handleEnd}
          onMuteToggle={handleMuteToggle}
          onStart={handleStart}
          pageTone={pageTone}
          palette={palette}
          popoverLeft={popoverPlacement.left}
          popoverTop={popoverPlacement.top}
          problem={problem}
          problemDifficultyColor={difficultyColor(problem?.difficulty ?? null, pageTone)}
          showCodeCaptureDebugAction={showCodeCaptureDebugAction}
          state={state}
          statusLabel={statusLabel}
          timerText={timerText}
          transformOrigin={popoverPlacement.transformOrigin}
        />
      ) : null}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  host: {
    position: "static",
    pointerEvents: "none",
    fontFamily:
      '"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  },
  anchorWrapper: {
    position: "fixed",
    display: "flex",
    alignItems: "center",
    height: `${TOOLBAR_BUTTON_SIZE}px`,
    pointerEvents: "auto"
  },
  toolbarButton: {
    width: `${TOOLBAR_BUTTON_SIZE}px`,
    height: `${TOOLBAR_BUTTON_SIZE}px`,
    borderRadius: "12px",
    border: "1px solid",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    padding: 0
  }
};
