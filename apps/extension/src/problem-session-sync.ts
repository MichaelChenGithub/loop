import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { LeetCodeProblem } from "./leetcode-page";
import type { RealtimeSession } from "./realtime-session";
import type { InterviewShellState } from "./state";

const isActiveSessionState = (
  sessionStatus: InterviewShellState["sessionStatus"]
): boolean => sessionStatus === "connecting" || sessionStatus === "connected";

export type ProblemSyncContext = {
  nextProblem: LeetCodeProblem | null;
  previousProblemRef: MutableRefObject<LeetCodeProblem | null>;
  previousSlugRef: MutableRefObject<string | null>;
  sessionRef: MutableRefObject<Pick<RealtimeSession, "end"> | null>;
  setProblem: Dispatch<SetStateAction<LeetCodeProblem | null>>;
  setState: Dispatch<SetStateAction<InterviewShellState>>;
  resetSessionState: (state: InterviewShellState) => InterviewShellState;
  getState: () => InterviewShellState;
};

const problemContentSignature = (problem: LeetCodeProblem | null): string =>
  JSON.stringify({
    title: problem?.title ?? "",
    difficulty: problem?.difficulty ?? null,
    description: problem?.description ?? "",
    examples: problem?.examples ?? [],
    constraints: problem?.constraints ?? []
  });

export const shouldCommitProblemSync = ({
  previousProblem,
  nextProblem
}: {
  previousProblem: LeetCodeProblem | null;
  nextProblem: LeetCodeProblem | null;
}): boolean => {
  if (!nextProblem) {
    return previousProblem === null;
  }

  if (!previousProblem) {
    return true;
  }

  if (previousProblem.slug === nextProblem.slug) {
    return true;
  }

  return problemContentSignature(previousProblem) !== problemContentSignature(nextProblem);
};

export const applyProblemSyncResult = ({
  nextProblem,
  previousProblemRef,
  previousSlugRef,
  sessionRef,
  setProblem,
  setState,
  resetSessionState,
  getState
}: ProblemSyncContext) => {
  if (
    !shouldCommitProblemSync({
      previousProblem: previousProblemRef.current,
      nextProblem
    })
  ) {
    return {
      didProblemChange: false,
      problem: previousProblemRef.current,
      slug: previousSlugRef.current
    };
  }

  const previousSlug = previousSlugRef.current;
  const nextSlug = nextProblem?.slug ?? null;
  const didProblemChange =
    previousSlug !== null && nextSlug !== null && previousSlug !== nextSlug;

  setProblem(nextProblem);
  previousProblemRef.current = nextProblem;

  if (nextSlug !== null) {
    previousSlugRef.current = nextSlug;
  }

  if (didProblemChange && isActiveSessionState(getState().sessionStatus)) {
    sessionRef.current?.end();
    sessionRef.current = null;
    setState((currentState) => resetSessionState(currentState));
  }

  return {
    didProblemChange,
    problem: nextProblem,
    slug: nextSlug
  };
};
