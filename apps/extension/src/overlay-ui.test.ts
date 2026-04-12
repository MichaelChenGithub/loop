import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LeetCodeProblem } from "./leetcode-page";
import type { InterviewShellState } from "./state";
import {
  BetaFullScreen,
  CollapsedToolbar,
  ExpandedPanel,
  NoQuotaScreen,
  SignInScreen
} from "./overlay-ui";

const problem: LeetCodeProblem = {
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "Easy",
  description: "Find two numbers that add up to target.",
  examples: [],
  constraints: []
};

const baseState: InterviewShellState = {
  baseControlMode: "collapsed",
  isMuted: false,
  isPanelExpanded: false,
  sessionStatus: "connected",
  remainingSeconds: 125
};

describe("overlay ui", () => {
  it("renders the collapsed toolbar controls with a color-only status indicator and mic-on icon", () => {
    const html = renderToStaticMarkup(
      createElement(CollapsedToolbar, {
        state: baseState,
        pageTone: "dark",
        timerText: "02:05",
        statusLabel: "Session connected",
        onMuteToggle: () => undefined,
        onEnd: () => undefined,
        onExpand: () => undefined
      })
    );

    expect(html).toContain("aria-label=\"Session connected\"");
    expect(html).toContain("aria-label=\"Mute microphone\"");
    expect(html).toContain("aria-label=\"End session\"");
    expect(html).toContain("aria-label=\"Expand interviewer panel\"");
    expect(html).toContain("data-icon=\"mic-on\"");
    expect(html).toContain("aria-label=\"Loop\"");
    expect(html).toContain("data-app-icon=\"true\"");
    expect(html).toContain(">02:05<");
    expect(html).toContain("min-height:38px");
    expect(html).toContain("padding:4px");
    expect(html).toContain("border:none");
  });

  it("renders the collapsed toolbar with branded single-surface chrome", () => {
    const html = renderToStaticMarkup(
      createElement(CollapsedToolbar, {
        state: baseState,
        pageTone: "dark",
        timerText: "02:05",
        statusLabel: "Session connected",
        onMuteToggle: () => undefined,
        onEnd: () => undefined,
        onExpand: () => undefined
      })
    );

    expect(html).toContain("background:rgba(24, 24, 24, 0.94)");
    expect(html).toContain("color:#fd9000");
    expect(html).toContain("border-radius:11px");
    expect(html).toContain("border-radius:8px");
    expect(html).toContain("color:#fa423d");
    expect(html).toContain("background:transparent");
    expect(html).toContain("data-icon=\"mic-on\"");
  });

  it("renders a different mic icon when muted", () => {
    const html = renderToStaticMarkup(
      createElement(CollapsedToolbar, {
        state: {
          ...baseState,
          isMuted: true
        },
        pageTone: "dark",
        timerText: "02:05",
        statusLabel: "Session connected",
        onMuteToggle: () => undefined,
        onEnd: () => undefined,
        onExpand: () => undefined
      })
    );

    expect(html).toContain("aria-label=\"Unmute microphone\"");
    expect(html).toContain("data-icon=\"mic-off\"");
  });

  it("renders the expanded panel session controls and problem context", () => {
    const html = renderToStaticMarkup(
      createElement(ExpandedPanel, {
        problem,
        state: {
          ...baseState,
          isPanelExpanded: true
        },
        palette: {
          panelBackground: "#0f172a",
          panelBorder: "#334155",
          panelText: "#e2e8f0",
          subtleText: "#94a3b8",
          divider: "rgba(255,255,255,0.05)",
          timerBackground: "#111827",
          secondaryBackground: "#1e293b",
          secondaryBorder: "#475569",
          utilityBackground: "#1d4ed8",
          utilityText: "#dbeafe",
          primaryBackground: "#f8fafc",
          primaryText: "#0f172a"
        },
        popoverTop: 48,
        popoverLeft: 64,
        transformOrigin: "top left",
        timerText: "02:05",
        statusLabel: "Session connected",
        onClose: () => undefined,
        onStart: () => undefined,
        onEnd: () => undefined,
        onMuteToggle: () => undefined,
        isStartDisabled: true,
        showCodeCaptureDebugAction: false
      })
    );

    expect(html).toContain("Loop");
    expect(html).toContain("data-app-icon=\"true\"");
    expect(html).toContain(">Status<");
    expect(html).toContain(">Problem<");
    expect(html).toContain(">Time remaining<");
    expect(html).toContain("Two Sum");
    expect(html).not.toContain("Easy");
    expect(html).toContain("aria-label=\"Session connected\"");
    expect(html).toContain("left:64px");
    expect(html).toContain("top:48px");
    expect(html).toContain(">End<");
    expect(html).toContain(">Start<");
    expect(html).toContain("aria-label=\"Mute microphone\"");
    expect(html).toContain("width:284px");
  });

  it("renders the timer in normal color when remainingSeconds > 300", () => {
    const html = renderToStaticMarkup(
      createElement(CollapsedToolbar, {
        state: { ...baseState, remainingSeconds: 301 },
        pageTone: "dark",
        timerText: "05:01",
        statusLabel: "Session connected",
        isTimerWarning: false,
        onMuteToggle: () => undefined,
        onEnd: () => undefined,
        onExpand: () => undefined
      })
    );

    expect(html).not.toContain("#f87171");
    expect(html).toContain("color:#fd9000");
  });

  it("renders the timer in warning color when isTimerWarning is true", () => {
    const html = renderToStaticMarkup(
      createElement(CollapsedToolbar, {
        state: { ...baseState, remainingSeconds: 300 },
        pageTone: "dark",
        timerText: "05:00",
        statusLabel: "Session connected",
        isTimerWarning: true,
        onMuteToggle: () => undefined,
        onEnd: () => undefined,
        onExpand: () => undefined
      })
    );

    expect(html).toContain("#f87171");
  });

  it("renders branding artwork only inside the collapsed loop chip", () => {
    const html = renderToStaticMarkup(
      createElement(CollapsedToolbar, {
        state: baseState,
        pageTone: "dark",
        timerText: "02:05",
        statusLabel: "Session connected",
        onMuteToggle: () => undefined,
        onEnd: () => undefined,
        onExpand: () => undefined
      })
    );

    expect(html).toContain("data-app-icon=\"true\"");
  });
});

const gatePalette = {
  panelBackground: "#0f172a",
  panelBorder: "#334155",
  panelText: "#e2e8f0",
  subtleText: "#94a3b8",
  divider: "rgba(255,255,255,0.05)",
  timerBackground: "#111827",
  secondaryBackground: "#1e293b",
  secondaryBorder: "#475569",
  utilityBackground: "#1d4ed8",
  utilityText: "#dbeafe",
  primaryBackground: "#f8fafc",
  primaryText: "#0f172a"
};

const gateProps = {
  palette: gatePalette,
  popoverTop: 48,
  popoverLeft: 64,
  transformOrigin: "top left"
};

describe("SignInScreen", () => {
  it("renders Loop branding and a sign-in button", () => {
    const html = renderToStaticMarkup(
      createElement(SignInScreen, { ...gateProps, onSignIn: () => undefined })
    );

    expect(html).toContain("Loop");
    expect(html).toContain("data-app-icon=\"true\"");
    expect(html).toContain("Sign in with Google");
    expect(html).toContain("aria-label=\"Loop sign in\"");
  });

  it("positions the panel at the given coordinates", () => {
    const html = renderToStaticMarkup(
      createElement(SignInScreen, { ...gateProps, onSignIn: () => undefined })
    );

    expect(html).toContain("top:48px");
    expect(html).toContain("left:64px");
  });
});

describe("BetaFullScreen", () => {
  it("renders the beta-full message and an email CTA", () => {
    const html = renderToStaticMarkup(
      createElement(BetaFullScreen, gateProps)
    );

    expect(html).toContain("Beta is full");
    expect(html).toContain("aria-label=\"Loop beta full\"");
    expect(html).toContain("Email me to get in");
    expect(html).toContain("mailto:");
  });
});

describe("NoQuotaScreen", () => {
  it("renders the no-quota message and an email CTA", () => {
    const html = renderToStaticMarkup(
      createElement(NoQuotaScreen, gateProps)
    );

    expect(html).toContain("No sessions remaining");
    expect(html).toContain("aria-label=\"Loop no quota\"");
    expect(html).toContain("Email me to get more");
    expect(html).toContain("mailto:");
  });
});
