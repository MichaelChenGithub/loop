import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOOP_NAVIGATE_EVENT } from "./leetcode-page";
import {
  createLeetCodeNavigationCoordinator,
  type NavigationSyncResult
} from "./leetcode-navigation";

let currentHref = "https://leetcode.com/problems/two-sum/";

describe("createLeetCodeNavigationCoordinator", () => {
  beforeEach(() => {
    const eventTarget = new EventTarget();
    currentHref = "https://leetcode.com/problems/two-sum/";

    vi.stubGlobal("window", {
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
      setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
      clearTimeout: (...args: Parameters<typeof clearTimeout>) =>
        clearTimeout(...args),
      setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
      clearInterval: (...args: Parameters<typeof clearInterval>) =>
        clearInterval(...args),
      location: {
        get href() {
          return currentHref;
        }
      }
    });

    vi.stubGlobal("history", {
      pushState: vi.fn(),
      replaceState: vi.fn()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("dispatches the shared navigation event on pushState, replaceState, and popstate", () => {
    const seenEvents: string[] = [];
    const listener = () => {
      seenEvents.push("navigate");
    };
    window.addEventListener(LOOP_NAVIGATE_EVENT, listener);

    const coordinator = createLeetCodeNavigationCoordinator({
      initialSyncDelaysMs: [],
      syncProblem: () => ({ didProblemChange: false, problem: null, slug: null })
    });

    history.pushState({}, "", "/problems/two-sum/");
    history.replaceState({}, "", "/problems/add-two-numbers/");
    window.dispatchEvent(new Event("popstate"));

    coordinator.dispose();
    window.removeEventListener(LOOP_NAVIGATE_EVENT, listener);

    expect(seenEvents).toHaveLength(3);
  });

  it("retries sync after navigation until a new problem slug is observed", () => {
    vi.useFakeTimers();
    const syncProblem = vi
      .fn<() => NavigationSyncResult>()
      .mockReturnValueOnce({
        didProblemChange: false,
        problem: null,
        slug: "two-sum"
      })
      .mockReturnValueOnce({
        didProblemChange: false,
        problem: null,
        slug: "two-sum"
      })
      .mockReturnValueOnce({
        didProblemChange: true,
        problem: {
          slug: "add-two-numbers",
          title: "Add Two Numbers",
          difficulty: "Medium",
          description: "desc",
          examples: [],
          constraints: []
        },
        slug: "add-two-numbers"
      });

    const coordinator = createLeetCodeNavigationCoordinator({
      initialSyncDelaysMs: [25, 50, 100],
      syncProblem
    });

    history.pushState({}, "", "/problems/add-two-numbers/");
    vi.advanceTimersByTime(75);

    coordinator.dispose();

    expect(syncProblem).toHaveBeenCalledTimes(3);
  });

  it("detects href changes that happen outside the content-script history patch", () => {
    vi.useFakeTimers();
    const syncProblem = vi
      .fn<() => NavigationSyncResult>()
      .mockReturnValue({
        didProblemChange: true,
        problem: null,
        slug: "add-two-numbers"
      });

    const coordinator = createLeetCodeNavigationCoordinator({
      initialSyncDelaysMs: [],
      syncProblem,
      pollIntervalMs: 50
    });

    currentHref = "https://leetcode.com/problems/add-two-numbers/";
    vi.advanceTimersByTime(60);

    coordinator.dispose();

    expect(syncProblem).toHaveBeenCalledTimes(1);
  });
});
