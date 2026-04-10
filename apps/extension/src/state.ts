export const SESSION_STATUSES = [
  "idle",
  "connecting",
  "connected",
  "ended"
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type InterviewShellState = {
  isPanelOpen: boolean;
  isMuted: boolean;
  sessionStatus: SessionStatus;
  remainingSeconds: number;
};

export const createInitialInterviewShellState = (): InterviewShellState => ({
  isPanelOpen: false,
  isMuted: false,
  sessionStatus: "idle",
  remainingSeconds: 0
});

export const openPanel = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  isPanelOpen: true
});

export const closePanel = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  isPanelOpen: false
});

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
  sessionStatus: "connecting"
});

// Transition: connecting → connected (WebRTC handshake succeeded)
export const confirmConnected = (
  state: InterviewShellState,
  remainingSeconds: number
): InterviewShellState => ({
  ...state,
  sessionStatus: "connected",
  remainingSeconds
});

// Transition: any → idle (connection failed)
export const sessionFailed = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  sessionStatus: "idle",
  remainingSeconds: 0
});

export const endSession = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
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
    return { ...state, sessionStatus: "ended", remainingSeconds: 0 };
  }

  return { ...state, remainingSeconds: next };
};
