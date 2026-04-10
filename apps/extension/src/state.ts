export const SESSION_STATUSES = [
  "idle",
  "connecting",
  "connected",
  "paused",
  "ended"
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type InterviewShellState = {
  isPanelOpen: boolean;
  isMuted: boolean;
  sessionStatus: SessionStatus;
  elapsedSeconds: number;
};

export const createInitialInterviewShellState = (): InterviewShellState => ({
  isPanelOpen: false,
  isMuted: false,
  sessionStatus: "idle",
  elapsedSeconds: 0
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

export const startSession = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  sessionStatus: "connected"
});

export const pauseSession = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  sessionStatus: "paused"
});

export const endSession = (
  state: InterviewShellState
): InterviewShellState => ({
  ...state,
  sessionStatus: "ended",
  elapsedSeconds: 0
});

export const tickTimer = (
  state: InterviewShellState
): InterviewShellState => {
  if (state.sessionStatus !== "connected") {
    return state;
  }

  return {
    ...state,
    elapsedSeconds: state.elapsedSeconds + 1
  };
};
