import { slugFromUrl } from "./leetcode-page";
import type { LatestCodeSnapshot } from "./code-snapshot";

type QueryableElement = Pick<Element, "textContent"> & {
  dataset?: Record<string, string>;
  value?: string;
  querySelector?: (selector: string) => Element | null;
  querySelectorAll?: (selector: string) => ArrayLike<Element>;
};

export type EditorQueryableDocument = {
  querySelector: (selector: string) => QueryableElement | null;
  querySelectorAll: (selector: string) => ArrayLike<QueryableElement>;
};

const TEXTAREA_SELECTOR =
  '.monaco-editor textarea, .monaco-editor [data-testid="code-area"] textarea';
const VIEW_LINES_SELECTOR = ".monaco-editor .view-lines";

const normalizeLineText = (text: string): string =>
  text.replace(/\u00a0/g, " ");

const readCodeFromTextarea = (
  doc: EditorQueryableDocument
): string | null => {
  const textarea = doc.querySelector(TEXTAREA_SELECTOR);
  const value =
    typeof textarea?.value === "string" ? textarea.value : textarea?.textContent;

  return typeof value === "string" ? value : null;
};

const readCodeFromViewLines = (
  doc: EditorQueryableDocument
): string | null => {
  const viewLines = doc.querySelector(VIEW_LINES_SELECTOR);
  const renderedLines = Array.from(
    viewLines?.querySelectorAll?.(".view-line") ?? []
  )
    .map((line) => normalizeLineText(line.textContent ?? ""))
    .join("\n");

  return renderedLines ? renderedLines : null;
};

const detectLanguage = (doc: EditorQueryableDocument): string | null => {
  const modeEl = doc.querySelector("[data-mode-id]");
  const modeId = modeEl?.dataset?.modeId?.trim();
  if (modeId) {
    return modeId;
  }

  const langButton = doc.querySelector('[data-cy="lang-select"]');
  const langText = langButton?.textContent?.trim();
  return langText || null;
};

export const extractLatestCodeSnapshotFromLeetCodeEditor = (
  doc: EditorQueryableDocument,
  url: URL,
  getNowIsoString: () => string = () => new Date().toISOString()
): LatestCodeSnapshot | null => {
  const code = readCodeFromTextarea(doc) ?? readCodeFromViewLines(doc);
  if (code === null) {
    return null;
  }

  return {
    language: detectLanguage(doc),
    code,
    updatedAt: getNowIsoString(),
    source: "leetcode-editor",
    problemSlug: slugFromUrl(url)
  };
};
