import { describe, expect, it } from "vitest";

import {
  collapseToToolbar,
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
  it("starts in launcher mode with the panel closed", () => {
    expect(createInitialInterviewShellState()).toEqual({
      baseControlMode: "launcher",
      isMuted: false,
      isPanelExpanded: false,
      sessionStatus: "idle",
      remainingSeconds: 0
    });
  });

  it("opens the full panel from the launcher and closes it without changing the base control mode", () => {
    const initialState = createInitialInterviewShellState();
    const openState = openPanel(initialState);

    expect(openState.baseControlMode).toBe("launcher");
    expect(openState.isPanelExpanded).toBe(true);
    expect(closePanel(openState)).toMatchObject({
      baseControlMode: "launcher",
      isPanelExpanded: false
    });
  });

  it("toggles mute without changing other shell state", () => {
    const initialState = createInitialInterviewShellState();
    const mutedState = toggleMute(initialState);

    expect(mutedState.isMuted).toBe(true);
    expect(mutedState.sessionStatus).toBe("idle");
    expect(mutedState.baseControlMode).toBe("launcher");
    expect(mutedState.isPanelExpanded).toBe(false);
  });

  it("tracks session lifecycle: connecting keeps launcher, connected switches base control to collapsed, ended returns to launcher", () => {
    const connectingState = startSession(createInitialInterviewShellState());
    const connectedState = confirmConnected(connectingState, 120);
    const endedState = endSession(connectedState);

    expect(connectingState.sessionStatus).toBe("connecting");
    expect(connectingState.baseControlMode).toBe("launcher");
    expect(connectingState.isPanelExpanded).toBe(true);
    expect(connectedState.sessionStatus).toBe("connected");
    expect(connectedState.baseControlMode).toBe("collapsed");
    expect(connectedState.isPanelExpanded).toBe(false);
    expect(connectedState.remainingSeconds).toBe(120);
    expect(endedState).toMatchObject({
      baseControlMode: "launcher",
      isPanelExpanded: true,
      sessionStatus: "ended",
      remainingSeconds: 0
    });
  });

  it("keeps the full panel open on session failure", () => {
    const failedState = sessionFailed(startSession(createInitialInterviewShellState()));

    expect(failedState.sessionStatus).toBe("idle");
    expect(failedState.remainingSeconds).toBe(0);
    expect(failedState.baseControlMode).toBe("launcher");
    expect(failedState.isPanelExpanded).toBe(true);
  });

  it("counts down the timer each tick while connected", () => {
    const connectedState = confirmConnected(
      startSession(createInitialInterviewShellState()),
      10
    );
    const afterTwoTicks = tickTimer(tickTimer(connectedState));

    expect(afterTwoTicks.remainingSeconds).toBe(8);
    expect(afterTwoTicks.sessionStatus).toBe("connected");
    expect(afterTwoTicks.baseControlMode).toBe("collapsed");
    expect(afterTwoTicks.isPanelExpanded).toBe(false);
  });

  it("auto-ends the session when the timer reaches zero and re-expands the panel", () => {
    const connectedState = confirmConnected(
      startSession(createInitialInterviewShellState()),
      1
    );
    const expiredState = tickTimer(connectedState);

    expect(expiredState.sessionStatus).toBe("ended");
    expect(expiredState.remainingSeconds).toBe(0);
    expect(expiredState.baseControlMode).toBe("launcher");
    expect(expiredState.isPanelExpanded).toBe(true);
  });

  it("does not decrement the timer while not connected", () => {
    const idleState = createInitialInterviewShellState();

    expect(tickTimer(idleState).remainingSeconds).toBe(0);
  });

  it("closing the panel during an active session keeps the collapsed base control visible", () => {
    const expandedState = openPanel(
      confirmConnected(startSession(createInitialInterviewShellState()), 60)
    );

    expect(expandedState.baseControlMode).toBe("collapsed");
    expect(expandedState.isPanelExpanded).toBe(true);
    expect(closePanel(expandedState)).toMatchObject({
      baseControlMode: "collapsed",
      isPanelExpanded: false
    });
  });

  it("collapsing to the toolbar only affects the panel expansion layer", () => {
    const expandedState = openPanel(
      confirmConnected(startSession(createInitialInterviewShellState()), 60)
    );

    expect(collapseToToolbar(expandedState)).toMatchObject({
      baseControlMode: "collapsed",
      isPanelExpanded: false,
      sessionStatus: "connected"
    });
  });
});
