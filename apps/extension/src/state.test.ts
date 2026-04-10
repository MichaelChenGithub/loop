import { describe, expect, it } from "vitest";

import {
  closePanel,
  confirmConnected,
  createInitialInterviewShellState,
  endSession,
  openPanel,
  sessionFailed,
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
      remainingSeconds: 0
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

  it("tracks session lifecycle: connecting → connected → ended", () => {
    const connectingState = startSession(createInitialInterviewShellState());
    const connectedState = confirmConnected(connectingState, 120);
    const endedState = endSession(connectedState);

    expect(connectingState.sessionStatus).toBe("connecting");
    expect(connectedState.sessionStatus).toBe("connected");
    expect(connectedState.remainingSeconds).toBe(120);
    expect(endedState).toMatchObject({ sessionStatus: "ended", remainingSeconds: 0 });
  });

  it("resets to idle on session failure", () => {
    const failedState = sessionFailed(startSession(createInitialInterviewShellState()));

    expect(failedState.sessionStatus).toBe("idle");
    expect(failedState.remainingSeconds).toBe(0);
  });

  it("counts down the timer each tick while connected", () => {
    const connectedState = confirmConnected(
      startSession(createInitialInterviewShellState()),
      10
    );
    const afterTwoTicks = tickTimer(tickTimer(connectedState));

    expect(afterTwoTicks.remainingSeconds).toBe(8);
    expect(afterTwoTicks.sessionStatus).toBe("connected");
  });

  it("auto-ends the session when the timer reaches zero", () => {
    const connectedState = confirmConnected(
      startSession(createInitialInterviewShellState()),
      1
    );
    const expiredState = tickTimer(connectedState);

    expect(expiredState.sessionStatus).toBe("ended");
    expect(expiredState.remainingSeconds).toBe(0);
  });

  it("does not decrement the timer while not connected", () => {
    const idleState = createInitialInterviewShellState();

    expect(tickTimer(idleState).remainingSeconds).toBe(0);
  });
});
