export type LeetCodeDifficulty = "Easy" | "Medium" | "Hard";
export type BackendProblemDifficulty = LeetCodeDifficulty | "Unknown";

export type LeetCodeExample = {
  input: string;
  output: string;
  explanation?: string;
};

export type LeetCodeProblem = {
  slug: string;
  title: string;
  difficulty: LeetCodeDifficulty | null;
  description: string;
  examples: LeetCodeExample[];
  constraints: string[];
};

export type ProblemForBackend = {
  slug: string;
  title: string;
  difficulty: BackendProblemDifficulty;
  description: string;
  examples: LeetCodeExample[];
  constraints: string[];
};

export type ProblemPayloadForBackend = {
  problem: ProblemForBackend;
};

/**
 * Custom event dispatched by the content script on history.pushState /
 * history.replaceState so any module can react to in-page SPA navigation.
 */
export const LOOP_NAVIGATE_EVENT = "loop:navigate";

type QueryableDoc = Pick<Document, "querySelector" | "title">;
type RichTextNode = {
  nodeType: number;
  textContent: string | null;
  tagName?: string;
  childNodes?: ArrayLike<RichTextNode>;
};

const DIFFICULTY_VALUES = ["Easy", "Medium", "Hard"] as const;
const BLOCK_TAGS = new Set([
  "article",
  "blockquote",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "ul"
]);

const DESCRIPTION_SELECTORS = [
  '[data-track-load="description_content"]',
  ".elfjS",
  '[class*="question-content"]',
  '[class*="description-content"]',
];

export const slugFromUrl = (url: URL): string | null => {
  const match = url.pathname.match(/\/problems\/([^/]+)/);
  return match?.[1] ?? null;
};

const extractTitle = (doc: QueryableDoc): string => {
  const dataCyEl = doc.querySelector('[data-cy="question-title"]');
  if (dataCyEl?.textContent?.trim()) {
    return dataCyEl.textContent.trim();
  }
  const titleMatch = doc.title.match(/^(?:\d+\.\s*)?(.+?)\s*[-\u2013]\s*LeetCode/i);
  return titleMatch?.[1]?.trim() ?? "";
};

const extractDifficulty = (doc: QueryableDoc): LeetCodeDifficulty | null => {
  for (const val of DIFFICULTY_VALUES) {
    if (doc.querySelector(`[diff="${val}"]`)) {
      return val;
    }
  }
  for (const val of DIFFICULTY_VALUES) {
    if (doc.querySelector(`[class*="difficulty-${val.toLowerCase()}"]`)) {
      return val;
    }
  }
  return null;
};

const serializeRichText = (node: RichTextNode): string => {
  if (node.nodeType === 3) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== 1) {
    return node.textContent ?? "";
  }

  const tagName = node.tagName?.toLowerCase() ?? "";

  if (tagName === "br") {
    return "\n";
  }

  const childText = Array.from(node.childNodes ?? [])
    .map((childNode) => serializeRichText(childNode))
    .join("");

  if (tagName === "sup") {
    return `^${childText}`;
  }

  if (BLOCK_TAGS.has(tagName)) {
    return `${childText}\n`;
  }

  return childText;
};

const extractDescriptionText = (doc: QueryableDoc): string => {
  for (const selector of DESCRIPTION_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el) {
      const serializedText = serializeRichText(el as unknown as RichTextNode).trim();
      if (serializedText) {
        return serializedText;
      }
    }
  }
  return "";
};

export const parseExamples = (text: string): LeetCodeExample[] => {
  const examples: LeetCodeExample[] = [];
  const exampleRe =
    /Example\s+\d+:?\s*\n([\s\S]+?)(?=Example\s+\d+:|Constraints:|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = exampleRe.exec(text)) !== null) {
    const block = match[1];
    const inputMatch = block.match(/Input:\s*([\s\S]+?)(?=Output:|$)/);
    const outputMatch = block.match(
      /Output:\s*([\s\S]+?)(?=Explanation:|Example\s+\d+:|Constraints:|$)/
    );
    const explanationMatch = block.match(/Explanation:\s*([\s\S]+?)$/);

    const input = inputMatch?.[1]?.trim() ?? "";
    const output = outputMatch?.[1]?.trim() ?? "";
    const explanation = explanationMatch?.[1]?.trim();

    if (input || output) {
      examples.push({ input, output, ...(explanation ? { explanation } : {}) });
    }
  }

  return examples;
};

export const parseDescription = (text: string): string => {
  const boundaryMatch = text.match(
    /\n\s*\n(?=Example\s+\d+:|Constraints:|Note:)/i
  );

  if (!boundaryMatch || boundaryMatch.index === undefined) {
    return text.trim();
  }

  return text.slice(0, boundaryMatch.index).trim();
};

export const parseConstraints = (text: string): string[] => {
  const lines = text.split("\n");
  const constraintsStartIndex = lines.findIndex((line) =>
    /^Constraints:\s*$/.test(line.trim())
  );

  if (constraintsStartIndex === -1) {
    return [];
  }

  const constraints: string[] = [];

  for (const rawLine of lines.slice(constraintsStartIndex + 1)) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      continue;
    }

    if (
      /^Example\s+\d+:?$/i.test(trimmedLine) ||
      /^(Follow[- ]up|Hint \d+|Note|Explanation):$/i.test(trimmedLine)
    ) {
      break;
    }

    constraints.push(
      trimmedLine
        .replace(/^[\s\u2022*]+/, "")
        .replace(/^-\s+/, "")
        .trim()
    );
  }

  return constraints.filter(Boolean);
};

export const extractLeetCodeProblem = (
  doc: QueryableDoc,
  url: URL
): LeetCodeProblem | null => {
  const slug = slugFromUrl(url);
  if (!slug) return null;

  const rawDescription = extractDescriptionText(doc);

  return {
    slug,
    title: extractTitle(doc),
    difficulty: extractDifficulty(doc),
    description: parseDescription(rawDescription),
    examples: parseExamples(rawDescription),
    constraints: parseConstraints(rawDescription),
  };
};

export const buildProblemPayloadForBackend = (
  problem: LeetCodeProblem | null,
  url: URL
): ProblemPayloadForBackend => {
  const fallbackSlug = slugFromUrl(url) ?? "cannot-parse-slug";

  return {
    problem: {
      slug: problem?.slug.trim() || fallbackSlug,
      title: problem?.title.trim() || "Cannot parse title",
      difficulty: problem?.difficulty ?? "Unknown",
      description: problem?.description.trim() || "Cannot parse description",
      examples: problem?.examples ?? [],
      constraints: problem?.constraints ?? [],
    },
  };
};

export const logLeetCodeProblemForDebug = (
  problem: LeetCodeProblem | null,
  url: URL
): void => {
  console.info(
    "[loop] Outbound backend payload",
    buildProblemPayloadForBackend(problem, url)
  );
};
