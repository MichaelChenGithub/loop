import { describe, expect, it } from "vitest";

import {
  extractLatestCodeSnapshotFromLeetCodeEditor,
  type EditorQueryableDocument
} from "./leetcode-editor";

const makeTextareaElement = (value: string) =>
  ({
    value,
    textContent: value
  }) as unknown as Element;

const makeElement = (
  textContent: string,
  options?: {
    dataset?: Record<string, string>;
    querySelector?: (selector: string) => Element | null;
    querySelectorAll?: (selector: string) => Element[];
  }
) =>
  ({
    textContent,
    dataset: options?.dataset ?? {},
    querySelector: options?.querySelector ?? (() => null),
    querySelectorAll: options?.querySelectorAll ?? (() => [])
  }) as unknown as Element;

const makeDoc = (opts: {
  querySelector?: (selector: string) => Element | null;
  querySelectorAll?: (selector: string) => Element[];
}): EditorQueryableDocument =>
  ({
    querySelector: opts.querySelector ?? (() => null),
    querySelectorAll: opts.querySelectorAll ?? (() => [])
  }) as EditorQueryableDocument;

describe("extractLatestCodeSnapshotFromLeetCodeEditor", () => {
  it("returns a normalized snapshot when the code editor surface is available", () => {
    const doc = makeDoc({
      querySelector: (selector) => {
        if (selector === '[data-mode-id]') {
          return makeElement("", {
            dataset: { modeId: "python3" }
          });
        }

        if (selector === ".monaco-editor textarea, .monaco-editor [data-testid=\"code-area\"] textarea") {
          return makeTextareaElement("class Solution:\n    pass");
        }

        return null;
      }
    });

    const snapshot = extractLatestCodeSnapshotFromLeetCodeEditor(
      doc,
      new URL("https://leetcode.com/problems/two-sum/description/"),
      () => "2026-04-10T15:30:00.000Z"
    );

    expect(snapshot).toEqual({
      language: "python3",
      code: "class Solution:\n    pass",
      updatedAt: "2026-04-10T15:30:00.000Z",
      source: "leetcode-editor",
      problemSlug: "two-sum"
    });
  });

  it("captures code from rendered monaco lines when no textarea is available", () => {
    const lineOne = makeElement("function twoSum(nums, target) {");
    const lineTwo = makeElement("  return [];");
    const lineThree = makeElement("}");
    const viewLines = makeElement("", {
      querySelectorAll: (selector) =>
        selector === ".view-line" ? [lineOne, lineTwo, lineThree] : []
    });
    const doc = makeDoc({
      querySelector: (selector) => {
        if (selector === ".monaco-editor .view-lines") {
          return viewLines;
        }

        return null;
      }
    });

    const snapshot = extractLatestCodeSnapshotFromLeetCodeEditor(
      doc,
      new URL("https://leetcode.com/problems/two-sum/"),
      () => "2026-04-10T15:30:00.000Z"
    );

    expect(snapshot?.code).toBe("function twoSum(nums, target) {\n  return [];\n}");
  });

  it("returns null language when the editor language cannot be detected", () => {
    const doc = makeDoc({
      querySelector: (selector) => {
        if (selector === ".monaco-editor textarea, .monaco-editor [data-testid=\"code-area\"] textarea") {
          return makeTextareaElement("print('hello')");
        }

        return null;
      }
    });

    const snapshot = extractLatestCodeSnapshotFromLeetCodeEditor(
      doc,
      new URL("https://leetcode.com/problems/two-sum/"),
      () => "2026-04-10T15:30:00.000Z"
    );

    expect(snapshot?.language).toBeNull();
  });

  it("returns null when no supported editor surface can be found", () => {
    const doc = makeDoc({});

    expect(
      extractLatestCodeSnapshotFromLeetCodeEditor(
        doc,
        new URL("https://leetcode.com/problems/two-sum/"),
        () => "2026-04-10T15:30:00.000Z"
      )
    ).toBeNull();
  });
});
