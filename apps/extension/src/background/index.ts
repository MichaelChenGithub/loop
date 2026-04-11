import {
  CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  type CaptureLatestCodeSnapshotResponse,
  type LatestCodeSnapshot
} from "../code-snapshot";

export type CurrentCodeContextToolOutput = {
  available: boolean;
  code: string | null;
  language: string | null;
  problemSlug: string | null;
  capturedAt: string | null;
  source: "leetcode-editor" | null;
};

let latestCodeSnapshot: LatestCodeSnapshot | null = null;

type RuntimeLike = Pick<typeof chrome.runtime, "onMessage">;
type MessageResponder = (response: CaptureLatestCodeSnapshotResponse) => void;

type MonacoSnapshotResult = {
  code: string;
  language: string | null;
  problemSlug: string | null;
} | null;

type CaptureSnapshotFromMainWorld = (tabId: number) => Promise<MonacoSnapshotResult>;

const captureSnapshotInMainWorld = (): MonacoSnapshotResult => {
  const mon = (window as unknown as { monaco?: { editor?: {
    getModels?: () => Array<{ getValue(): string; getLanguageId(): string | null }>;
  } } }).monaco?.editor;
  if (!mon) return null;
  const slug =
    window.location.pathname.match(/\/problems\/([^/]+)/)?.[1] ?? null;
  const lang: string | null =
    (document.querySelector("[data-mode-id]") as HTMLElement | null)
      ?.dataset?.modeId?.trim() ??
    document.querySelector('[data-cy="lang-select"]')?.textContent?.trim() ??
    null;
  const SKIP = new Set(["plaintext", "markdown", "json", "yaml", "xml", "html", "css"]);
  const models = mon.getModels?.() ?? [];
  const target = models.find(
    (m) => m.getValue().length > 0 && !SKIP.has(m.getLanguageId() ?? "")
  );
  if (!target) return null;
  return {
    code: target.getValue(),
    language: target.getLanguageId() ?? lang,
    problemSlug: slug
  };
};

const defaultCaptureSnapshotFromMainWorld: CaptureSnapshotFromMainWorld = async (
  tabId
) => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: captureSnapshotInMainWorld
  });
  return results?.[0]?.result ?? null;
};

export const getLatestCodeSnapshot = (): LatestCodeSnapshot | null =>
  latestCodeSnapshot;

export const hasMeaningfulSnapshotChange = (
  currentSnapshot: LatestCodeSnapshot | null,
  nextSnapshot: LatestCodeSnapshot
): boolean =>
  currentSnapshot === null ||
  currentSnapshot.code !== nextSnapshot.code ||
  currentSnapshot.language !== nextSnapshot.language ||
  currentSnapshot.problemSlug !== nextSnapshot.problemSlug;

export const setLatestCodeSnapshot = (
  snapshot: LatestCodeSnapshot
): LatestCodeSnapshot => {
  if (!hasMeaningfulSnapshotChange(latestCodeSnapshot, snapshot)) {
    return latestCodeSnapshot ?? snapshot;
  }

  latestCodeSnapshot = snapshot;
  return snapshot;
};

export const clearLatestCodeSnapshot = (): void => {
  latestCodeSnapshot = null;
};

export const buildCurrentCodeContextToolOutput = (
  snapshot: LatestCodeSnapshot
): CurrentCodeContextToolOutput => ({
  available: true,
  code: snapshot.code,
  language: snapshot.language,
  problemSlug: snapshot.problemSlug,
  capturedAt: snapshot.updatedAt,
  source: snapshot.source
});

export const buildEmptyCurrentCodeContextToolOutput =
  (): CurrentCodeContextToolOutput => ({
    available: false,
    code: null,
    language: null,
    problemSlug: null,
    capturedAt: null,
    source: null
  });

const logRealtimeToolCall = (snapshot: LatestCodeSnapshot | null): void => {
  console.log("[loop] Realtime tool call", {
    tool: "get_current_code_context",
    available: snapshot !== null,
    problemSlug: snapshot?.problemSlug ?? null
  });
};

const logRealtimeToolResult = (output: CurrentCodeContextToolOutput): void => {
  console.log("[loop] Realtime tool result", {
    tool: "get_current_code_context",
    available: output.available,
    problemSlug: output.problemSlug,
    language: output.language,
    hasCode: Boolean(output.code),
    code: output.code
  });

  if (output.code !== null) {
    console.log("[loop] Realtime tool code", output.code);
  }
};

export const installBackgroundMessageHandlers = ({
  runtime = chrome.runtime,
  captureSnapshotFromMainWorld = defaultCaptureSnapshotFromMainWorld,
  getNowIsoString = () => new Date().toISOString()
}: {
  runtime?: RuntimeLike;
  captureSnapshotFromMainWorld?: CaptureSnapshotFromMainWorld;
  getNowIsoString?: () => string;
} = {}): void => {
  // Keep the canonical snapshot here so future Realtime tool calling can read
  // from background instead of depending on page-local React/content-script state.
  runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE) {
      const snapshot = getLatestCodeSnapshot();
      logRealtimeToolCall(snapshot);
      logRealtimeToolResult(
        snapshot
          ? buildCurrentCodeContextToolOutput(snapshot)
          : buildEmptyCurrentCodeContextToolOutput()
      );
      (sendResponse as MessageResponder)({
        snapshot
      } satisfies CaptureLatestCodeSnapshotResponse);
      return false;
    }

    if (message?.type !== CAPTURE_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE) {
      return undefined;
    }

    const tabId = sender.tab?.id;

    if (typeof tabId !== "number") {
      (sendResponse as MessageResponder)({
        snapshot: null
      } satisfies CaptureLatestCodeSnapshotResponse);
      return false;
    }

    void captureSnapshotFromMainWorld(tabId).then((result) => {
      let snapshot: LatestCodeSnapshot | null = null;
      if (result) {
        snapshot = {
          code: result.code,
          language: result.language,
          problemSlug: result.problemSlug,
          updatedAt: getNowIsoString(),
          source: "leetcode-editor"
        };
        setLatestCodeSnapshot(snapshot);
        console.log("[loop] latest code snapshot", snapshot);
      }

      (sendResponse as MessageResponder)({
        snapshot
      } satisfies CaptureLatestCodeSnapshotResponse);
    });

    return true;
  });
};

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  installBackgroundMessageHandlers();
}
