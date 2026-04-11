import { forwardRef, type CSSProperties } from "react";

import { AppIcon } from "./AppIcon";
import type { LeetCodeProblem } from "./leetcode-page";
import type { InterviewShellState } from "./state";

export type PageTone = "dark" | "light";

export type OverlayPalette = {
  panelBackground: string;
  panelBorder: string;
  panelText: string;
  subtleText: string;
  divider: string;
  timerBackground: string;
  utilityBackground: string;
  utilityText: string;
  secondaryBackground: string;
  secondaryBorder: string;
  primaryBackground: string;
  primaryText: string;
};

const getStatusColor = (status: InterviewShellState["sessionStatus"]) => {
  switch (status) {
    case "connecting":
      return "#60a5fa";
    case "connected":
      return "#22c55e";
    case "ended":
      return "#ef4444";
    case "idle":
    default:
      return "#94a3b8";
  }
};

const getMicLabel = (isMuted: boolean) =>
  isMuted ? "Unmute microphone" : "Mute microphone";

const ExpandIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    fill="none"
    height={size}
    viewBox="0 0 12 12"
    width={size}
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 7.5v2.5h2.5M10 4.5V2H7.5M4.5 10H2v-2.5M7.5 2H10v2.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.2"
    />
  </svg>
);

const MicIcon = ({ isMuted, size = 18 }: { isMuted: boolean; size?: number }) => (
  <span
    aria-hidden="true"
    data-icon={isMuted ? "mic-off" : "mic-on"}
    style={{ ...styles.micIcon, width: size, height: size }}>
    {isMuted ? (
      <svg
        fill="none"
        height={size}
        viewBox="0 0 14 14"
        width={size}
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9.92 8.08A3.5 3.5 0 0 1 4.1 4.63M5.83 11.08h2.34M7 9.92v1.16M10.5 6.42a3.5 3.5 0 0 1-5.98 2.06M2.92 6.42a4.08 4.08 0 0 0 7.5 2.2M7 1.75a1.75 1.75 0 0 1 1.75 1.75v1.47M2.33 2.33l9.34 9.34"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />
      </svg>
    ) : (
      <svg
        fill="none"
        height={size}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg">
        <rect
          height="12"
          rx="3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          width="6"
          x="9"
          y="2"
        />
        <path
          d="M5 10v2a7 7 0 0 0 14 0v-2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M12 19v3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M8 22h8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    )}
  </span>
);

export const CollapsedToolbar = ({
  state,
  pageTone,
  timerText,
  statusLabel,
  onMuteToggle,
  onEnd,
  onExpand
}: {
  state: InterviewShellState;
  pageTone: PageTone;
  timerText: string;
  statusLabel: string;
  onMuteToggle: () => void;
  onEnd: () => void;
  onExpand: () => void;
}) => {
  const tp =
    pageTone === "dark"
      ? {
          container: "transparent",
          border: "transparent",
          text: "rgba(226, 232, 240, 0.82)",
          timer: "#5eead4",
          btnBg: "transparent",
          endBg: "transparent",
          endText: "#fca5a5",
          divider: "rgba(148, 163, 184, 0.24)"
        }
      : {
          container: "transparent",
          border: "transparent",
          text: "rgba(71, 85, 105, 0.88)",
          timer: "#0f766e",
          btnBg: "transparent",
          endBg: "transparent",
          endText: "#dc2626",
          divider: "rgba(100, 116, 139, 0.22)"
        };

  return (
    <section
      aria-label="Loop interviewer toolbar"
      style={{
        ...styles.collapsedToolbar,
        background: tp.container,
        borderColor: tp.border,
        color: tp.text
      }}>
      <span
        aria-label={statusLabel}
        role="status"
        style={{
          ...styles.statusDot,
          backgroundColor: getStatusColor(state.sessionStatus)
        }}
      />
      <strong
        aria-label="Time remaining"
        style={{ ...styles.collapsedTimer, color: tp.timer }}>
        {timerText}
      </strong>
      <span style={{ ...styles.toolbarDivider, background: tp.divider }} />
      <button
        aria-label={getMicLabel(state.isMuted)}
        onClick={onMuteToggle}
        style={{ ...styles.iconBtn, background: tp.btnBg, color: tp.text }}
        type="button">
        <MicIcon isMuted={state.isMuted} />
      </button>
      <button
        aria-label="End session"
        onClick={onEnd}
        style={{ ...styles.endBtn, background: tp.endBg, color: tp.endText }}
        type="button">
        End
      </button>
      <button
        aria-label="Expand interviewer panel"
        onClick={onExpand}
        style={{ ...styles.iconBtn, background: tp.btnBg, color: tp.text }}
        type="button">
        <ExpandIcon />
      </button>
    </section>
  );
};

export const ExpandedPanel = forwardRef<
  HTMLElement,
  {
    problem: LeetCodeProblem | null;
    state: InterviewShellState;
    palette: OverlayPalette;
    popoverTop: number;
    popoverLeft: number;
    transformOrigin: string;
    timerText: string;
    statusLabel: string;
    onClose: () => void;
    onStart: () => void;
    onEnd: () => void;
    onMuteToggle: () => void;
    isStartDisabled: boolean;
    showCodeCaptureDebugAction: boolean;
    onCaptureCode?: () => void;
  }
>(
  (
    {
      problem,
      state,
      palette,
      popoverTop,
      popoverLeft,
      transformOrigin,
      timerText,
      statusLabel,
      onClose,
      onStart,
      onEnd,
      onMuteToggle,
      isStartDisabled,
      showCodeCaptureDebugAction,
      onCaptureCode
    },
    ref
  ) => (
  <section
    ref={ref}
    aria-label="Loop interviewer popover"
    style={{
      ...styles.popover,
      top: `${popoverTop}px`,
      left: `${popoverLeft}px`,
      transformOrigin,
      background: palette.panelBackground,
      borderColor: palette.panelBorder,
      color: palette.panelText
    }}>
    <div style={styles.headerRow}>
      <div style={styles.brandBlock}>
        <AppIcon decorative size={22} style={styles.brandIcon} />
        <h2 style={styles.brandTitle}>Loop</h2>
      </div>
    </div>

    <div style={styles.sectionStack}>
      <div style={styles.section}>
        <span style={{ ...styles.sectionLabel, color: palette.subtleText }}>
          Status
        </span>
        <div style={styles.statusRow}>
          <span
            aria-label={statusLabel}
            role="status"
            style={{
              ...styles.statusDot,
              backgroundColor: getStatusColor(state.sessionStatus)
            }}
          />
          <span style={styles.statusText}>
            {state.sessionStatus === "connected"
              ? "Session active"
              : state.sessionStatus === "connecting"
                ? "Session connecting"
                : state.sessionStatus === "ended"
                  ? "Session ended"
                  : "Session idle"}
          </span>
        </div>
      </div>

      <div style={{ ...styles.divider, background: palette.divider }} />

      {problem ? (
        <>
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, color: palette.subtleText }}>
              Problem
            </span>
            <span
              style={{ ...styles.problemTitle, color: palette.panelText }}
              title={problem.title}>
              {problem.title || problem.slug}
            </span>
          </div>
          <div style={{ ...styles.divider, background: palette.divider }} />
        </>
      ) : null}

      <div style={styles.section}>
        <span style={{ ...styles.sectionLabel, color: palette.subtleText }}>
          Time remaining
        </span>
        <div
          style={{
            ...styles.timerRow,
            background: palette.timerBackground
          }}>
          <strong style={styles.timerValue}>{timerText}</strong>
          <span
            aria-hidden="true"
            style={{ ...styles.timerAccent, background: palette.utilityText }}
          />
        </div>
      </div>

      <div style={{ ...styles.divider, background: palette.divider }} />

      <div style={styles.actionsRow}>
        <button
          disabled={isStartDisabled}
          onClick={onStart}
          style={{
            ...styles.primaryButton,
            background: palette.primaryBackground,
            color: palette.primaryText,
            opacity: isStartDisabled ? 0.5 : 1,
            cursor: isStartDisabled ? "default" : "pointer"
          }}
          type="button">
          {state.sessionStatus === "connecting" ? "Connecting..." : "Start"}
        </button>
        <button
          onClick={onEnd}
          style={{
            ...styles.secondaryButton,
            background: palette.secondaryBackground,
            color: palette.panelText
          }}
          type="button">
          End
        </button>
        <button
          aria-label={getMicLabel(state.isMuted)}
          onClick={onMuteToggle}
          style={{
            ...styles.iconButton,
            ...styles.micButton,
            background: palette.secondaryBackground,
            color: palette.panelText
          }}
          type="button">
          <MicIcon isMuted={state.isMuted} size={14} />
        </button>
      </div>
    </div>

    {showCodeCaptureDebugAction && onCaptureCode ? (
      <div style={styles.debugRow}>
        <button
          onClick={onCaptureCode}
          style={{
            ...styles.debugButton,
            background: palette.secondaryBackground,
            color: palette.panelText
          }}
          type="button">
          Capture code
        </button>
      </div>
    ) : null}
  </section>
));

const styles: Record<string, CSSProperties> = {
  collapsedToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    height: "36px",
    padding: 0,
    borderRadius: "8px",
    background: "transparent",
    border: "none",
    color: "#e5e7eb",
    whiteSpace: "nowrap"
  },
  collapsedTimer: {
    fontSize: "13px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    color: "#e5e7eb",
    minWidth: "38px",
    padding: "0 4px"
  },
  toolbarDivider: {
    width: "1px",
    height: "14px",
    background: "rgba(255, 255, 255, 0.15)",
    flexShrink: 0,
    margin: "0 2px"
  },
  iconBtn: {
    width: "26px",
    height: "26px",
    borderRadius: "999px",
    border: "none",
    background: "transparent",
    color: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0
  },
  endBtn: {
    height: "26px",
    padding: "0 8px",
    borderRadius: "999px",
    border: "none",
    background: "transparent",
    color: "#f87171",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0
  },
  micIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "12px",
    height: "12px"
  },
  popover: {
    position: "fixed",
    width: "284px",
    borderRadius: "20px",
    border: "1px solid transparent",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.18)",
    padding: "13px 14px 12px",
    pointerEvents: "auto",
    backdropFilter: "blur(18px)"
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px"
  },
  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: 0
  },
  brandIcon: {
    borderRadius: "7px"
  },
  brandTitle: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: "-0.02em"
  },
  iconButton: {
    width: "26px",
    height: "26px",
    borderRadius: "999px",
    border: "none",
    display: "grid",
    placeItems: "center",
    fontSize: "12px",
    lineHeight: 1,
    flexShrink: 0,
    cursor: "pointer"
  },
  micButton: {
    width: "38px",
    height: "38px",
    borderRadius: "11px"
  },
  sectionStack: {
    display: "grid",
    gap: "8px",
    marginTop: "10px"
  },
  section: {
    display: "grid",
    gap: "4px"
  },
  sectionLabel: {
    fontSize: "10px",
    lineHeight: 1.1
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  statusText: {
    fontSize: "12px",
    lineHeight: 1.3,
    fontWeight: 500
  },
  divider: {
    height: "0.5px",
    opacity: 1,
    margin: "2px 0"
  },
  problemTitle: {
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: 1.34
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "999px",
    display: "inline-block",
    flexShrink: 0
  },
  timerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "10px"
  },
  timerValue: {
    fontSize: "29px",
    lineHeight: 0.94,
    letterSpacing: "-0.04em",
    fontWeight: 600
  },
  timerAccent: {
    width: "18px",
    height: "3px",
    borderRadius: "999px",
    flexShrink: 0
  },
  actionsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: "8px",
    paddingTop: "4px"
  },
  primaryButton: {
    border: "none",
    borderRadius: "11px",
    minHeight: "38px",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: 600
  },
  secondaryButton: {
    borderRadius: "11px",
    border: "none",
    minHeight: "38px",
    padding: "0 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer"
  },
  debugRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "12px"
  },
  debugButton: {
    borderRadius: "12px",
    border: "none",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  }
};
