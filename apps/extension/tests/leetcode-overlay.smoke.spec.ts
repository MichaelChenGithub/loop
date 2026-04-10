import { expect, test, chromium, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(dirname, "../build/chrome-mv3-prod");
const chromeExecutable = [
  process.env.LOOP_EXTENSION_SMOKE_BROWSER,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
].find((candidate): candidate is string => Boolean(candidate) && existsSync(candidate));

const problemPageHtml = (includeAnchor: boolean) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LeetCode Fixture</title>
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: #0f1115;
        color: #e5e7eb;
      }

      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .layout-button {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 0;
        background: #1f2937;
        color: #e5e7eb;
      }

      .workspace {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        padding: 24px;
      }

      .panel {
        min-height: 420px;
        border-radius: 16px;
        background: #181c24;
        padding: 20px;
      }

      .block {
        width: 100%;
        min-height: 96px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        background: #111827;
        color: inherit;
        margin-top: 12px;
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      ${includeAnchor ? '<button type="button" class="layout-button"><div id="qd-layout-manager-btn" aria-label="Layouts">Layout</div></button>' : ""}
      <button type="button" class="layout-button" aria-label="Timer">T</button>
    </div>
    <div class="workspace">
      <section class="panel">
        <button id="description-block" class="block" type="button">Description block</button>
      </section>
      <section class="panel">
        <button id="code-block" class="block" type="button">Code block</button>
        <button id="testcase-block" class="block" type="button">Testcase block</button>
      </section>
    </div>
  </body>
</html>`;

const installLeetCodeFixtures = async (page: Page) => {
  await page.route("https://leetcode.com/**", async (route) => {
    const url = route.request().url();
    const includeAnchor = url.includes("/problems/");

    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: problemPageHtml(includeAnchor)
    });
  });
};

test.describe.configure({ mode: "serial" });
test.skip(!chromeExecutable, "Requires a local Chrome executable for extension smoke tests.");

let context: BrowserContext;
let userDataDir: string;
let browserHomeDir: string;

test.beforeAll(async () => {
  if (!existsSync(extensionPath)) {
    throw new Error("Build the extension first with `corepack pnpm --dir apps/extension build`.");
  }

  userDataDir = mkdtempSync(path.join(tmpdir(), "loop-extension-smoke-"));
  browserHomeDir = mkdtempSync(path.join(tmpdir(), "loop-extension-home-"));
  mkdirSync(path.join(browserHomeDir, "Library", "Application Support", "Google", "Chrome", "Crashpad"), {
    recursive: true
  });
  context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: chromeExecutable,
    headless: false,
    env: {
      ...process.env,
      HOME: browserHomeDir
    },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });
});

test.afterAll(async () => {
  await context?.close();

  if (userDataDir) {
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (browserHomeDir) {
    rmSync(browserHomeDir, { recursive: true, force: true });
  }
});

test("shows on initial load, stays visible across block clicks, and toggles the popover", async () => {
  const page = await context.newPage();
  await installLeetCodeFixtures(page);

  await page.goto("https://leetcode.com/problems/two-sum/description/");

  const launcher = page.getByRole("button", { name: "Open Loop interviewer" });
  const popover = page.getByLabel("Loop interviewer popover");

  await expect(launcher).toBeVisible();
  await page.getByRole("button", { name: "Description block" }).click();
  await expect(launcher).toBeVisible();
  await page.getByRole("button", { name: "Code block" }).click();
  await expect(launcher).toBeVisible();

  await launcher.click();
  await expect(popover).toBeVisible();

  await page.getByRole("button", { name: "Testcase block" }).click();
  await expect(popover).toBeHidden();
  await expect(launcher).toBeVisible();

  await page.close();
});

test("stays hidden when the layout anchor button is absent", async () => {
  const page = await context.newPage();
  await installLeetCodeFixtures(page);

  await page.goto("https://leetcode.com/problemset/");

  await expect(page.getByRole("button", { name: "Open Loop interviewer" })).toHaveCount(0);
  await page.close();
});
