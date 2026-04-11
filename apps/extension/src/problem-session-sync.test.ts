import { describe, expect, it, vi } from "vitest";

import type { LeetCodeProblem } from "./leetcode-page";
import {
  applyProblemSyncResult,
  shouldCommitProblemSync,
  type ProblemSyncContext
} from "./problem-session-sync";
import { confirmConnected, createInitialInterviewShellState, startSession } from "./state";

const problem = (slug: string): LeetCodeProblem => ({
  slug,
  title: slug,
  difficulty: "Medium",
  description: "desc",
  examples: [],
  constraints: []
});

describe("applyProblemSyncResult", () => {
  it("ends an active session when the problem slug changes", () => {
    const sessionEnd = vi.fn();
    const setProblem = vi.fn();
    const setState = vi.fn();
    const sessionRef: ProblemSyncContext["sessionRef"] = {
      current: { end: sessionEnd }
    };

    applyProblemSyncResult({
      nextProblem: problem("add-two-numbers"),
      previousProblemRef: { current: problem("two-sum") },
      previousSlugRef: { current: "two-sum" },
      sessionRef,
      setProblem,
      setState,
      resetSessionState: (currentState) => currentState,
      getState: () =>
        confirmConnected(startSession(createInitialInterviewShellState()), 60)
    });

    expect(sessionEnd).toHaveBeenCalledTimes(1);
    expect(sessionRef.current).toBeNull();
    expect(setProblem).toHaveBeenCalledWith(problem("add-two-numbers"));
    expect(setState).toHaveBeenCalledTimes(1);
  });

  it("does not end the session when the slug is unchanged", () => {
    const sessionEnd = vi.fn();
    const setState = vi.fn();

    applyProblemSyncResult({
      nextProblem: problem("two-sum"),
      previousProblemRef: { current: problem("two-sum") },
      previousSlugRef: { current: "two-sum" },
      sessionRef: {
        current: { end: sessionEnd }
      },
      setProblem: vi.fn(),
      setState,
      resetSessionState: (currentState) => currentState,
      getState: () =>
        confirmConnected(startSession(createInitialInterviewShellState()), 60)
    });

    expect(sessionEnd).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
  });

  it("updates the stored slug without ending an idle session", () => {
    const previousSlugRef = { current: "two-sum" };

    applyProblemSyncResult({
      nextProblem: problem("add-two-numbers"),
      previousProblemRef: { current: problem("two-sum") },
      previousSlugRef,
      sessionRef: { current: null },
      setProblem: vi.fn(),
      setState: vi.fn(),
      resetSessionState: (currentState) => currentState,
      getState: () => createInitialInterviewShellState()
    });

    expect(previousSlugRef.current).toBe("add-two-numbers");
  });

  it("does not commit a new slug when the DOM still matches the previous problem content", () => {
    const previousProblem = {
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "Medium" as const,
      description: "Find two numbers.",
      examples: [{ input: "a", output: "b" }],
      constraints: ["1 <= n"]
    };

    expect(
      shouldCommitProblemSync({
        previousProblem,
        nextProblem: {
          ...previousProblem,
          slug: "add-two-numbers"
        }
      })
    ).toBe(false);
  });

});
