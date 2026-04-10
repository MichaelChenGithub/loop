import { describe, expect, it, vi } from "vitest";

import {
  buildProblemPayloadForBackend,
  extractLeetCodeProblem,
  logLeetCodeProblemForDebug,
  parseDescription,
  parseConstraints,
  parseExamples,
  slugFromUrl,
  type LeetCodeProblem
} from "./leetcode-page";

type QueryableDoc = Pick<Document, "querySelector" | "title">;

const makeDoc = (opts: {
  title?: string;
  querySelector?: (sel: string) => Element | null;
}): QueryableDoc => ({
  title: opts.title ?? "",
  querySelector: opts.querySelector ?? (() => null)
});

// ---------------------------------------------------------------------------
// slugFromUrl
// ---------------------------------------------------------------------------

describe("slugFromUrl", () => {
  it("extracts slug from a canonical problem URL", () => {
    expect(slugFromUrl(new URL("https://leetcode.com/problems/two-sum/"))).toBe(
      "two-sum"
    );
  });

  it("extracts slug when a sub-path is present", () => {
    expect(
      slugFromUrl(
        new URL("https://leetcode.com/problems/two-sum/description/")
      )
    ).toBe("two-sum");
  });

  it("returns null for non-problem URLs", () => {
    expect(
      slugFromUrl(new URL("https://leetcode.com/problemset/"))
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseExamples
// ---------------------------------------------------------------------------

describe("parseExamples", () => {
  it("parses a single example with input and output", () => {
    const text = [
      "Example 1:",
      "Input: nums = [2,7,11,15], target = 9",
      "Output: [0,1]",
      "",
      "Constraints:"
    ].join("\n");

    const examples = parseExamples(text);
    expect(examples).toHaveLength(1);
    expect(examples[0].input).toBe("nums = [2,7,11,15], target = 9");
    expect(examples[0].output).toBe("[0,1]");
    expect(examples[0].explanation).toBeUndefined();
  });

  it("includes explanation when present", () => {
    const text = [
      "Example 1:",
      "Input: x = 121",
      "Output: true",
      "Explanation: 121 reads the same.",
      "",
      "Constraints:"
    ].join("\n");

    const examples = parseExamples(text);
    expect(examples[0].explanation).toBe("121 reads the same.");
  });

  it("parses multiple examples", () => {
    const text = [
      "Example 1:",
      "Input: nums = [2,7], target = 9",
      "Output: [0,1]",
      "Example 2:",
      "Input: nums = [3,2,4], target = 6",
      "Output: [1,2]",
      "",
      "Constraints:"
    ].join("\n");

    const examples = parseExamples(text);
    expect(examples).toHaveLength(2);
    expect(examples[1].input).toBe("nums = [3,2,4], target = 6");
    expect(examples[1].output).toBe("[1,2]");
  });

  it("returns empty array when no examples are present", () => {
    expect(parseExamples("A problem statement with no examples.")).toHaveLength(
      0
    );
  });
});

// ---------------------------------------------------------------------------
// parseDescription
// ---------------------------------------------------------------------------

describe("parseDescription", () => {
  it("returns only the main problem statement before examples", () => {
    const text = [
      "Given an array of integers nums and an integer target, return indices.",
      "",
      "Example 1:",
      "Input: nums = [2,7,11,15], target = 9",
      "Output: [0,1]"
    ].join("\n");

    expect(parseDescription(text)).toBe(
      "Given an array of integers nums and an integer target, return indices."
    );
  });

  it("stops at constraints when no examples are present", () => {
    const text = [
      "Given nums and target, return their indices.",
      "",
      "Constraints:",
      "2 <= nums.length <= 10^4"
    ].join("\n");

    expect(parseDescription(text)).toBe(
      "Given nums and target, return their indices."
    );
  });

  it("keeps follow-up in description but stops at note sections", () => {
    const followUpText = [
      "Given nums and target, return their indices.",
      "",
      "Follow-up:",
      "Can you do it in O(n) time?"
    ].join("\n");
    const noteText = [
      "Given nums and target, return their indices.",
      "",
      "Note:",
      "You may assume exactly one solution."
    ].join("\n");

    expect(parseDescription(followUpText)).toBe(
      [
        "Given nums and target, return their indices.",
        "",
        "Follow-up:",
        "Can you do it in O(n) time?"
      ].join("\n")
    );
    expect(parseDescription(noteText)).toBe(
      "Given nums and target, return their indices."
    );
  });
});

// ---------------------------------------------------------------------------
// parseConstraints
// ---------------------------------------------------------------------------

describe("parseConstraints", () => {
  it("extracts constraint lines", () => {
    const text = [
      "Some description",
      "",
      "Constraints:",
      "1 <= n <= 100",
      "n is an integer",
      "",
      "Follow up:"
    ].join("\n");

    expect(parseConstraints(text)).toEqual([
      "1 <= n <= 100",
      "n is an integer"
    ]);
  });

  it("strips leading bullet and dash characters", () => {
    const text = ["Constraints:", "\u2022 1 <= n <= 100", "- m >= 0", ""].join(
      "\n"
    );

    expect(parseConstraints(text)).toEqual(["1 <= n <= 100", "m >= 0"]);
  });

  it("returns empty array when no Constraints section exists", () => {
    expect(parseConstraints("No constraints section here.")).toHaveLength(0);
  });

  it("preserves leading minus signs for negative bounds", () => {
    const text = [
      "Constraints:",
      "-10^9 <= target <= 10^9",
      "-10^9 <= nums[i] <= 10^9",
      ""
    ].join("\n");

    expect(parseConstraints(text)).toEqual([
      "-10^9 <= target <= 10^9",
      "-10^9 <= nums[i] <= 10^9"
    ]);
  });

  it("parses multiple constraints when blank lines appear between items", () => {
    const text = [
      "Constraints:",
      "2 <= nums.length <= 10^4",
      "",
      "-10^9 <= nums[i] <= 10^9",
      "",
      "-10^9 <= target <= 10^9",
      "",
      "Follow-up:"
    ].join("\n");

    expect(parseConstraints(text)).toEqual([
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9"
    ]);
  });
});

// ---------------------------------------------------------------------------
// extractLeetCodeProblem
// ---------------------------------------------------------------------------

describe("extractLeetCodeProblem", () => {
  it("returns null for a non-problem URL", () => {
    const doc = makeDoc({ title: "" });
    expect(
      extractLeetCodeProblem(doc, new URL("https://leetcode.com/problemset/"))
    ).toBeNull();
  });

  it("derives slug from the URL pathname", () => {
    const doc = makeDoc({ title: "1. Two Sum - LeetCode" });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    );
    expect(result?.slug).toBe("two-sum");
  });

  it("parses title from document.title", () => {
    const doc = makeDoc({ title: "1. Two Sum - LeetCode" });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    );
    expect(result?.title).toBe("Two Sum");
  });

  it("prefers data-cy title element over document.title", () => {
    const doc = makeDoc({
      title: "1. Two Sum - LeetCode",
      querySelector: (sel) => {
        if (sel === '[data-cy="question-title"]') {
          return { textContent: "Two Sum (DOM)" } as Element;
        }
        return null;
      }
    });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    );
    expect(result?.title).toBe("Two Sum (DOM)");
  });

  it("extracts difficulty from the diff attribute", () => {
    const doc = makeDoc({
      title: "Two Sum - LeetCode",
      querySelector: (sel) =>
        sel === '[diff="Easy"]' ? ({} as Element) : null
    });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    );
    expect(result?.difficulty).toBe("Easy");
  });

  it("extracts difficulty from class-substring fallback", () => {
    const doc = makeDoc({
      title: "Two Sum - LeetCode",
      querySelector: (sel) =>
        sel === '[class*="difficulty-medium"]' ? ({} as Element) : null
    });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    );
    expect(result?.difficulty).toBe("Medium");
  });

  it("returns null difficulty when no selector matches", () => {
    const doc = makeDoc({ title: "Two Sum - LeetCode" });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    );
    expect(result?.difficulty).toBeNull();
  });

  it("degrades gracefully when the description element is absent", () => {
    const doc = makeDoc({ title: "Two Sum - LeetCode" });
    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    ) as LeetCodeProblem;
    expect(result.description).toBe("");
    expect(result.examples).toEqual([]);
    expect(result.constraints).toEqual([]);
  });

  it("populates examples and constraints from the description element", () => {
    const descText = [
      "Given an array of integers nums and an integer target.",
      "",
      "Example 1:",
      "Input: nums = [2,7], target = 9",
      "Output: [0,1]",
      "",
      "Constraints:",
      "2 <= nums.length <= 10^4",
      ""
    ].join("\n");

    const doc = makeDoc({
      title: "1. Two Sum - LeetCode",
      querySelector: (sel) => {
        if (sel === '[data-track-load="description_content"]') {
          return { textContent: descText } as Element;
        }
        return null;
      }
    });

    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    ) as LeetCodeProblem;

    expect(result.examples).toHaveLength(1);
    expect(result.examples[0].input).toBe("nums = [2,7], target = 9");
    expect(result.examples[0].output).toBe("[0,1]");
    expect(result.description).toBe(
      "Given an array of integers nums and an integer target."
    );
    expect(result.constraints).toEqual(["2 <= nums.length <= 10^4"]);
  });

  it("preserves superscript exponents in constraints", () => {
    const textNode = (text: string) =>
      ({
        nodeType: 3,
        textContent: text
      }) as unknown as ChildNode;

    const elementNode = (tagName: string, childNodes: ChildNode[]) =>
      ({
        nodeType: 1,
        tagName,
        childNodes,
        textContent: childNodes.map((node) => node.textContent ?? "").join("")
      }) as unknown as Element;

    const descElement = elementNode("div", [
      textNode("Given nums and target.\n\nConstraints:\n-10"),
      elementNode("sup", [textNode("9")]),
      textNode(" <= target <= 10"),
      elementNode("sup", [textNode("9")]),
      textNode("\n")
    ]);

    const doc = makeDoc({
      title: "1. Two Sum - LeetCode",
      querySelector: (sel) => {
        if (sel === '[data-track-load="description_content"]') {
          return descElement;
        }
        return null;
      }
    });

    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    ) as LeetCodeProblem;

    expect(result.constraints).toEqual(["-10^9 <= target <= 10^9"]);
  });

  it("extracts multiple constraints from separate rendered list items", () => {
    const textNode = (text: string) =>
      ({
        nodeType: 3,
        textContent: text
      }) as unknown as ChildNode;

    const elementNode = (tagName: string, childNodes: ChildNode[]) =>
      ({
        nodeType: 1,
        tagName,
        childNodes,
        textContent: childNodes.map((node) => node.textContent ?? "").join("")
      }) as unknown as Element;

    const descElement = elementNode("div", [
      elementNode("p", [textNode("Given nums and target.")]),
      elementNode("p", [textNode("Constraints:")]),
      elementNode("ul", [
        elementNode("li", [textNode("2 <= nums.length <= 10"), elementNode("sup", [textNode("4")])]),
        elementNode("li", [textNode("-10 <= nums[i] <= 10")]),
        elementNode("li", [textNode("-10 <= target <= 10")])
      ])
    ]);

    const doc = makeDoc({
      title: "1. Two Sum - LeetCode",
      querySelector: (sel) => {
        if (sel === '[data-track-load="description_content"]') {
          return descElement;
        }
        return null;
      }
    });

    const result = extractLeetCodeProblem(
      doc,
      new URL("https://leetcode.com/problems/two-sum/")
    ) as LeetCodeProblem;

    expect(result.constraints).toEqual([
      "2 <= nums.length <= 10^4",
      "-10 <= nums[i] <= 10",
      "-10 <= target <= 10"
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildProblemPayloadForBackend
// ---------------------------------------------------------------------------

describe("buildProblemPayloadForBackend", () => {
  it("wraps the parsed problem in the outbound backend payload shape", () => {
    const problem: LeetCodeProblem = {
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      description: "Given an array of integers nums and an integer target.",
      examples: [{ input: "nums = [2,7], target = 9", output: "[0,1]" }],
      constraints: ["2 <= nums.length <= 10^4"]
    };

    expect(
      buildProblemPayloadForBackend(
        problem,
        new URL("https://leetcode.com/problems/two-sum/")
      )
    ).toEqual({
      problem
    });
  });

  it("fills fallback fields when parsing is partial", () => {
    expect(
      buildProblemPayloadForBackend(
        {
          slug: "two-sum",
          title: "",
          difficulty: null,
          description: "",
          examples: [],
          constraints: []
        },
        new URL("https://leetcode.com/problems/two-sum/")
      )
    ).toEqual({
      problem: {
        slug: "two-sum",
        title: "Cannot parse title",
        difficulty: "Unknown",
        description: "Cannot parse description",
        examples: [],
        constraints: []
      }
    });
  });

  it("builds a fallback payload when no problem has been parsed", () => {
    expect(
      buildProblemPayloadForBackend(
        null,
        new URL("https://leetcode.com/problems/two-sum/")
      )
    ).toEqual({
      problem: {
        slug: "two-sum",
        title: "Cannot parse title",
        difficulty: "Unknown",
        description: "Cannot parse description",
        examples: [],
        constraints: []
      }
    });
  });

  it("falls back to a sentinel slug when the URL is not a problem page", () => {
    expect(
      buildProblemPayloadForBackend(
        null,
        new URL("https://leetcode.com/problemset/")
      )
    ).toEqual({
      problem: {
        slug: "cannot-parse-slug",
        title: "Cannot parse title",
        difficulty: "Unknown",
        description: "Cannot parse description",
        examples: [],
        constraints: []
      }
    });
  });
});

// ---------------------------------------------------------------------------
// logLeetCodeProblemForDebug
// ---------------------------------------------------------------------------

describe("logLeetCodeProblemForDebug", () => {
  it("logs the outbound backend payload to the console", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const problem: LeetCodeProblem = {
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      description: "Given an array of integers nums and an integer target.",
      examples: [{ input: "nums = [2,7], target = 9", output: "[0,1]" }],
      constraints: ["2 <= nums.length <= 10^4"]
    };

    logLeetCodeProblemForDebug(
      problem,
      new URL("https://leetcode.com/problems/two-sum/")
    );

    expect(infoSpy).toHaveBeenCalledWith("[loop] Outbound backend payload", {
      problem
    });

    infoSpy.mockRestore();
  });

  it("logs when no problem payload could be extracted", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logLeetCodeProblemForDebug(
      null,
      new URL("https://leetcode.com/problems/two-sum/")
    );

    expect(infoSpy).toHaveBeenCalledWith(
      "[loop] Outbound backend payload",
      {
        problem: {
          slug: "two-sum",
          title: "Cannot parse title",
          difficulty: "Unknown",
          description: "Cannot parse description",
          examples: [],
          constraints: []
        }
      }
    );

    infoSpy.mockRestore();
  });
});
