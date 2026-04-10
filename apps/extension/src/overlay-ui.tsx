import { forwardRef, type CSSProperties } from "react";

import type { LeetCodeProblem } from "./leetcode-page";
import type { InterviewShellState } from "./state";

export type PageTone = "dark" | "light";

export type OverlayPalette = {
  panelBackground: string;
  panelBorder: string;
  panelText: string;
  subtleText: string;
  timerBackground: string;
  utilityBackground: string;
  utilityText: string;
  secondaryBackground: string;
  secondaryBorder: string;
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
        viewBox="0 0 14 14"
        width={size}
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7 9.92A3.5 3.5 0 0 0 10.5 6.42V5.25M3.5 5.25v1.17A3.5 3.5 0 0 0 7 9.92ZM7 9.92v1.16M5.83 11.08h2.34M7 1.75A1.75 1.75 0 0 1 8.75 3.5v2.92A1.75 1.75 0 1 1 5.25 6.42V3.5A1.75 1.75 0 0 1 7 1.75Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
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
    pageTone: PageTone;
    problemDifficultyColor: string;
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
      pageTone,
      problemDifficultyColor,
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
      <div>
        <p style={{ ...styles.eyebrow, color: palette.subtleText }}>Loop</p>
        <h2 style={styles.title}>Interviewer</h2>
      </div>
      <button
        aria-label="Close interviewer panel"
        onClick={onClose}
        style={{
          ...styles.iconButton,
          background: palette.secondaryBackground,
          borderColor: palette.secondaryBorder,
          color: palette.panelText
        }}
        type="button">
        x
      </button>
    </div>

    {problem ? (
      <div style={styles.problemCard}>
        <span
          style={{
            ...styles.difficultyBadge,
            color: problemDifficultyColor
          }}>
          {problem.difficulty ?? "-"}
        </span>
        <span
          style={{ ...styles.problemTitle, color: palette.panelText }}
          title={problem.title}>
          {problem.title || problem.slug}
        </span>
      </div>
    ) : null}

    <div style={styles.summaryRow}>
      <span
        aria-label={statusLabel}
        role="status"
        style={{
          ...styles.statusDot,
          backgroundColor: getStatusColor(state.sessionStatus)
        }}
      />
      <span style={{ ...styles.inlineHint, color: palette.subtleText }}>
        {state.sessionStatus === "connected" ? "session active" : "session setup"}
      </span>
    </div>

    <div
      style={{
        ...styles.timerCard,
        background: palette.timerBackground
      }}>
      <span style={styles.timerLabel}>Time remaining</span>
      <strong style={styles.timerValue}>{timerText}</strong>
    </div>

    <div style={styles.primaryControls}>
      <button
        disabled={isStartDisabled}
        onClick={onStart}
        style={{
          ...styles.primaryButton,
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
          borderColor: palette.secondaryBorder,
          color: palette.panelText
        }}
        type="button">
        End
      </button>
    </div>

    <div style={styles.footerRow}>
      <button
        onClick={onMuteToggle}
        style={{
          ...styles.utilityButton,
          background: palette.utilityBackground,
          color: palette.utilityText
        }}
        type="button">
        {state.isMuted ? "Unmute mic" : "Mute mic"}
      </button>
      <span style={{ ...styles.hintText, color: palette.subtleText }}>
        {pageTone === "dark" ? "Esc to collapse" : "Click outside to collapse"}
      </span>
    </div>

    {showCodeCaptureDebugAction && onCaptureCode ? (
      <div style={styles.debugRow}>
        <button
          onClick={onCaptureCode}
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
    width: "336px",
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
    fontSize: "18px",
    lineHeight: 1,
    flexShrink: 0,
    cursor: "pointer"
  },
  problemCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "12px"
  },
  difficultyBadge: {
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em"
  },
  problemTitle: {
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.35
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px"
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "999px",
    display: "inline-block",
    flexShrink: 0
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
  }
};
