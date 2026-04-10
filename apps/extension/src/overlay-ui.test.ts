import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LeetCodeProblem } from "./leetcode-page";
import type { InterviewShellState } from "./state";
import { CollapsedToolbar, ExpandedPanel } from "./overlay-ui";

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
    expect(html).toContain(">02:05<");
    expect(html).toContain("height:36px");
    expect(html).toContain("padding:0");
    expect(html).toContain("border:none");
  });

  it("renders the collapsed toolbar with flat inline chrome and branded timer emphasis", () => {
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

    expect(html).toContain("background:transparent");
    expect(html).toContain("color:#5eead4");
    expect(html).toContain("border-radius:999px");
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
        pageTone: "dark",
        problemDifficultyColor: "#4ade80",
        palette: {
          panelBackground: "#0f172a",
          panelBorder: "#334155",
          panelText: "#e2e8f0",
          subtleText: "#94a3b8",
          timerBackground: "#111827",
          secondaryBackground: "#1e293b",
          secondaryBorder: "#475569",
          utilityBackground: "#1d4ed8",
          utilityText: "#dbeafe"
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
    expect(html).toContain("Interviewer");
    expect(html).toContain("Two Sum");
    expect(html).toContain("aria-label=\"Session connected\"");
    expect(html).toContain("left:64px");
    expect(html).toContain("top:48px");
    expect(html).toContain(">End<");
    expect(html).toContain(">Mute mic<");
  });
});
