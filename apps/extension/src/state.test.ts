import { describe, expect, it } from "vitest";

import {
  closePanel,
  createInitialInterviewShellState,
  endSession,
  openPanel,
  pauseSession,
  startSession,
  tickTimer,
  toggleMute
} from "./state";

describe("interview shell state", () => {
  it("starts closed and idle by default", () => {
    expect(createInitialInterviewShellState()).toEqual({
      isPanelOpen: false,
      isMuted: false,
      sessionStatus: "idle",
      elapsedSeconds: 0
    });
  });

  it("opens and closes the floating panel", () => {
    const initialState = createInitialInterviewShellState();
    const openState = openPanel(initialState);

    expect(openState.isPanelOpen).toBe(true);
    expect(closePanel(openState).isPanelOpen).toBe(false);
  });

  it("toggles mute without changing other shell state", () => {
    const initialState = createInitialInterviewShellState();
    const mutedState = toggleMute(initialState);

    expect(mutedState.isMuted).toBe(true);
    expect(mutedState.sessionStatus).toBe("idle");
  });

  it("tracks session lifecycle and resets the timer on end", () => {
    const connectedState = startSession(createInitialInterviewShellState());
    const runningState = tickTimer(tickTimer(connectedState));
    const pausedState = pauseSession(runningState);
    const endedState = endSession(pausedState);

    expect(connectedState.sessionStatus).toBe("connected");
    expect(runningState.elapsedSeconds).toBe(2);
    expect(pausedState.sessionStatus).toBe("paused");
    expect(endedState).toMatchObject({
      sessionStatus: "ended",
      elapsedSeconds: 0
    });
  });

  it("does not increment the timer while not connected", () => {
    const pausedState = pauseSession(startSession(createInitialInterviewShellState()));

    expect(tickTimer(pausedState).elapsedSeconds).toBe(0);
  });
});
