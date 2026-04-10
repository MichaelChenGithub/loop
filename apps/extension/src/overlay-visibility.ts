export const LAYOUT_MANAGER_BUTTON_ID = "qd-layout-manager-btn";

const isLeetCodeHost = (url: URL) =>
  url.hostname === "leetcode.com" || url.hostname.endsWith(".leetcode.com");

export const hasLeetCodeToolbarAnchor = (
  doc: Pick<Document, "getElementById">
) => doc.getElementById(LAYOUT_MANAGER_BUTTON_ID) !== null;

export const shouldMountInterviewOverlay = (
  url: URL,
  doc: Pick<Document, "getElementById">
) => isLeetCodeHost(url) && hasLeetCodeToolbarAnchor(doc);
