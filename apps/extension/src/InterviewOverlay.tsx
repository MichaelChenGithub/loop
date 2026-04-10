import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties
} from "react";

import {
  extractLeetCodeProblem,
  logLeetCodeProblemForDebug,
  LOOP_NAVIGATE_EVENT,
  type LeetCodeProblem
} from "./leetcode-page";
import { captureLatestCodeSnapshot } from "./code-snapshot-runtime";
import { shouldShowCodeCaptureDebugAction } from "./debug-controls";
import { computePopoverPlacement } from "./popover-placement";
import { fetchClientSecret, RealtimeSession } from "./realtime-session";
import {
  TOOLBAR_BUTTON_SIZE,
  resolveToolbarAnchor,
  type ToolbarAnchorResult
} from "./toolbar-anchor";
import {
  closePanel as closeShellPanel,
  confirmConnected,
  createInitialInterviewShellState,
  endSession,
  sessionFailed,
  startSession,
  tickTimer,
  toggleMute,
  type InterviewShellState
} from "./state";
import { INITIAL_OVERLAY_SYNC_DELAYS_MS } from "./overlay-bootstrap";
import { shouldMountInterviewOverlay } from "./overlay-visibility";

const PANEL_WIDTH = 336;
const PANEL_ESTIMATED_HEIGHT = 260;

const API_BASE_URL =
  process.env.PLASMO_PUBLIC_API_HOST ?? "http://localhost:8000";

type PageTone = "dark" | "light";

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
      return "Connected";
    case "connecting":
      return "Connecting";
    case "ended":
      return "Ended";
    case "idle":
    default:
      return "Idle";
  }
};

const getStatusTone = (
  status: InterviewShellState["sessionStatus"],
  pageTone: PageTone
) => {
  switch (status) {
    case "connected":
      return pageTone === "dark" ? "#5ee3a1" : "#1d7a57";
    case "ended":
      return "#e05c7b";
    case "connecting":
      return "#60a5fa";
    case "idle":
    default:
      return pageTone === "dark" ? "#a7b4c6" : "#475569";
  }
};

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight
});

const readPageTone = (): PageTone => {
  const sample =
    window.getComputedStyle(document.body).backgroundColor ||
    window.getComputedStyle(document.documentElement).backgroundColor;
  const match = sample.match(/\d+/g);

  if (!match || match.length < 3) {
    return "dark";
  }

  const [red, green, blue] = match.slice(0, 3).map(Number);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance < 140 ? "dark" : "light";
};

const difficultyColor = (
  d: LeetCodeProblem["difficulty"],
  tone: PageTone
): string => {
  if (d === "Easy") return tone === "dark" ? "#4ade80" : "#15803d";
  if (d === "Medium") return tone === "dark" ? "#fbbf24" : "#d97706";
  if (d === "Hard") return tone === "dark" ? "#f87171" : "#dc2626";
  return tone === "dark" ? "#94a3b8" : "#64748b";
};

const sameAnchor = (left: ToolbarAnchorResult, right: ToolbarAnchorResult) =>
  left.mode === right.mode &&
  left.buttonRect.top === right.buttonRect.top &&
  left.buttonRect.left === right.buttonRect.left &&
  left.buttonRect.width === right.buttonRect.width &&
  left.buttonRect.height === right.buttonRect.height;

export const InterviewOverlay = () => {
  const [isVisible, setIsVisible] = useState(() =>
    shouldMountInterviewOverlay(new URL(window.location.href), document)
  );
  const [state, setState] = useState(createInitialInterviewShellState);
  const [anchor, setAnchor] = useState<ToolbarAnchorResult>(() =>
    resolveToolbarAnchor(document, getViewport())
  );
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);

  // Show/hide based on URL and toolbar presence (replaces content-script syncOverlay)
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

  // Tick countdown while connected
  useEffect(() => {
    const sync = () => {
      const nextProblem = extractLeetCodeProblem(
        document,
        new URL(window.location.href)
      );
      logLeetCodeProblemForDebug(nextProblem);
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

  // Clean up WebRTC when session ends (including auto-expiry)
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
    if (!state.isPanelOpen) {
      return;
    }

    const popoverSize = {
      width: popoverRef.current?.offsetWidth ?? PANEL_WIDTH,
      height: popoverRef.current?.offsetHeight ?? PANEL_ESTIMATED_HEIGHT
    };

    setPopoverPlacement(
      computePopoverPlacement(anchor.buttonRect, popoverSize, getViewport())
    );
  }, [anchor, state.isPanelOpen]);

  useEffect(() => {
    if (!state.isPanelOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const path = event.composedPath();

      if (
        (buttonRef.current && path.includes(buttonRef.current)) ||
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
  }, [state.isPanelOpen]);

  const togglePanel = () => {
    setState((currentState) =>
      currentState.isPanelOpen
        ? closeShellPanel(currentState)
        : { ...currentState, isPanelOpen: true }
    );
  };

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
        const secret = await fetchClientSecret(API_BASE_URL);
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
  }, []);

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

  if (!isVisible) {
    return null;
  }

  return (
    <div style={styles.host}>
      <button
        aria-expanded={state.isPanelOpen}
        aria-label="Open Loop interviewer"
        onClick={togglePanel}
        ref={buttonRef}
        style={{
          ...styles.toolbarButton,
          top: `${anchor.buttonRect.top}px`,
          left: `${anchor.buttonRect.left}px`,
          background: palette.buttonBackground,
          borderColor: palette.buttonBorder,
          color: palette.buttonText
        }}
        type="button">
        <span style={styles.buttonCore}>L</span>
      </button>

      {state.isPanelOpen ? (
        <section
          aria-label="Loop interviewer popover"
          ref={popoverRef}
          style={{
            ...styles.popover,
            top: `${popoverPlacement.top}px`,
            left: `${popoverPlacement.left}px`,
            transformOrigin: popoverPlacement.transformOrigin,
            background: palette.panelBackground,
            borderColor: palette.panelBorder,
            color: palette.panelText
          }}>
          <div style={styles.headerRow}>
            <div>
              <p style={{ ...styles.eyebrow, color: palette.subtleText }}>Loop</p>
              <h2 style={styles.title}>Interviewer</h2>
            </div>
            <button
              aria-label="Close interviewer panel"
              onClick={() => setState((currentState) => closeShellPanel(currentState))}
              style={{
                ...styles.iconButton,
                background: palette.secondaryBackground,
                borderColor: palette.secondaryBorder,
                color: palette.panelText
              }}
              type="button">
              ×
            </button>
          </div>

          {problem ? (
            <div style={styles.problemCard}>
              <span
                style={{
                  ...styles.difficultyBadge,
                  color: difficultyColor(problem.difficulty, pageTone)
                }}>
                {problem.difficulty ?? "\u2014"}
              </span>
              <span
                style={{ ...styles.problemTitle, color: palette.panelText }}
                title={problem.title}>
                {problem.title || problem.slug}
              </span>
            </div>
          ) : null}

          <div style={styles.summaryRow}>
            <div
              aria-live="polite"
              style={{
                ...styles.statusPill,
                color: getStatusTone(state.sessionStatus, pageTone),
                backgroundColor:
                  pageTone === "dark" ? "rgba(30, 41, 59, 0.68)" : "rgba(255,255,255,0.8)"
              }}>
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: getStatusTone(state.sessionStatus, pageTone)
                }}
              />
              {getConnectionLabel(state.sessionStatus)}
            </div>
            <span style={{ ...styles.inlineHint, color: palette.subtleText }}>
              toolbar popover
            </span>
          </div>

          <div
            style={{
              ...styles.timerCard,
              background: palette.timerBackground
            }}>
            <span style={styles.timerLabel}>Time remaining</span>
            <strong style={styles.timerValue}>
              {formatTime(state.remainingSeconds)}
            </strong>
          </div>

          <div style={styles.primaryControls}>
            <button
              disabled={isStartDisabled}
              onClick={handleStart}
              style={{
                ...styles.primaryButton,
                opacity: isStartDisabled ? 0.5 : 1,
                cursor: isStartDisabled ? "default" : "pointer"
              }}
              type="button">
              {state.sessionStatus === "connecting" ? "Connecting…" : "Start"}
            </button>
            <button
              onClick={handleEnd}
              style={{
                ...styles.secondaryButton,
                background: palette.secondaryBackground,
                borderColor: palette.secondaryBorder,
                color: palette.panelText
              }}
              type="button">
              End
            </button>
          </div>

          <div style={styles.footerRow}>
            <button
              onClick={handleMuteToggle}
              style={{
                ...styles.utilityButton,
                background: palette.utilityBackground,
                color: palette.utilityText
              }}
              type="button">
              {state.isMuted ? "Unmute mic" : "Mute mic"}
            </button>
            <span style={{ ...styles.hintText, color: palette.subtleText }}>
              outside click closes
            </span>
          </div>

          {showCodeCaptureDebugAction ? (
            <div style={styles.debugRow}>
              <button
                onClick={handleCaptureCode}
                style={{
                  ...styles.debugButton,
                  background: palette.secondaryBackground,
                  borderColor: palette.secondaryBorder,
                  color: palette.panelText
                }}
                type="button">
                Capture code
              </button>
            </div>
          ) : null}
        </section>
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
  toolbarButton: {
    position: "fixed",
    width: `${TOOLBAR_BUTTON_SIZE}px`,
    height: `${TOOLBAR_BUTTON_SIZE}px`,
    borderRadius: "12px",
    border: "1px solid",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.24)",
    pointerEvents: "auto",
    cursor: "pointer",
    padding: 0
  },
  buttonCore: {
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1
  },
  popover: {
    position: "fixed",
    width: `${PANEL_WIDTH}px`,
    borderRadius: "20px",
    border: "1px solid",
    boxShadow: "0 28px 60px rgba(15, 23, 42, 0.28)",
    padding: "14px",
    pointerEvents: "auto",
    backdropFilter: "blur(12px)"
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px"
  },
  eyebrow: {
    margin: 0,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase"
  },
  title: {
    margin: "4px 0 0",
    fontSize: "28px",
    lineHeight: 0.95,
    letterSpacing: "-0.04em"
  },
  iconButton: {
    width: "32px",
    height: "32px",
    borderRadius: "999px",
    border: "1px solid",
    display: "grid",
    placeItems: "center",
    fontSize: "22px",
    lineHeight: 1,
    flexShrink: 0,
    cursor: "pointer"
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "10px"
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 700
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px"
  },
  inlineHint: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em"
  },
  timerCard: {
    marginTop: "14px",
    color: "#e2e8f0",
    borderRadius: "18px",
    padding: "16px 18px"
  },
  timerLabel: {
    display: "block",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#94a3b8"
  },
  timerValue: {
    display: "block",
    marginTop: "10px",
    fontSize: "44px",
    lineHeight: 1,
    letterSpacing: "-0.05em"
  },
  primaryControls: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "14px"
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    backgroundColor: "#0f766e",
    color: "#f8fafc",
    padding: "13px 10px",
    fontWeight: 700
  },
  secondaryButton: {
    borderRadius: "14px",
    border: "1px solid",
    padding: "13px 10px",
    fontWeight: 700,
    cursor: "pointer"
  },
  footerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "14px"
  },
  utilityButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  hintText: {
    fontSize: "12px",
    textAlign: "right"
  },
  debugRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "12px"
  },
  debugButton: {
    borderRadius: "12px",
    border: "1px solid",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  problemCard: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
    overflow: "hidden"
  },
  difficultyBadge: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    flexShrink: 0
  },
  problemTitle: {
    fontSize: "13px",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
};
