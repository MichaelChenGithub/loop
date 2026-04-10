export const SESSION_STATUSES = [
  "idle",
  "connecting",
  "connected",
  "ended"
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];
export const BASE_CONTROL_MODES = ["launcher", "collapsed"] as const;
export type BaseControlMode = (typeof BASE_CONTROL_MODES)[number];

export type InterviewShellState = {
  baseControlMode: BaseControlMode;
  isMuted: boolean;
  isPanelExpanded: boolean;
  sessionStatus: SessionStatus;
  remainingSeconds: number;
};

export const createInitialInterviewShellState = (): InterviewShellState => ({
  baseControlMode: "launcher",
  isMuted: false,
  isPanelExpanded: false,
  sessionStatus: "idle",
  remainingSeconds: 0
});

export const openPanel = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  isPanelExpanded: true
});

export const closePanel = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  isPanelExpanded: false
});

export const collapseToToolbar = closePanel;

export const toggleMute = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  isMuted: !state.isMuted
});

// Transition: idle/ended → connecting (user pressed Start)
export const startSession = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  baseControlMode: "launcher",
  isPanelExpanded: true,
  sessionStatus: "connecting"
});

// Transition: connecting → connected (WebRTC handshake succeeded)
export const confirmConnected = (
  state: InterviewShellState,
  remainingSeconds: number
): InterviewShellState => ({
  ...state,
  baseControlMode: "collapsed",
  isPanelExpanded: false,
  sessionStatus: "connected",
  remainingSeconds
});

// Transition: any → idle (connection failed)
export const sessionFailed = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  baseControlMode: "launcher",
  isPanelExpanded: true,
  sessionStatus: "idle",
  remainingSeconds: 0
});

export const endSession = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  baseControlMode: "launcher",
  isPanelExpanded: true,
  sessionStatus: "ended",
  remainingSeconds: 0
});

export const tickTimer = (
  state: InterviewShellState
): InterviewShellState => {
  if (state.sessionStatus !== "connected") {
    return state;
  }

  const next = state.remainingSeconds - 1;

  if (next <= 0) {
    return {
      ...state,
      baseControlMode: "launcher",
      isPanelExpanded: true,
      sessionStatus: "ended",
      remainingSeconds: 0
    };
  }

  return { ...state, remainingSeconds: next };
};
