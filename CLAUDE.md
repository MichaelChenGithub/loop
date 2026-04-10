# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Install dependencies**
```
corepack pnpm install
```

**Extension development**
```
corepack pnpm dev:extension          # run extension locally via Plasmo (serve on 127.0.0.1:10123, HMR on :18123)
corepack pnpm build:extension        # build extension artifact
corepack pnpm typecheck              # TypeScript check for shared + extension
corepack pnpm --dir apps/extension test    # run extension unit tests (Vitest)
corepack pnpm --dir apps/extension smoke   # run Playwright smoke tests
```

**Run a single test file**
```
corepack pnpm --dir apps/extension test -- state.test.ts
```

**API backend**
```
python -m pytest services/api/tests   # run all API tests
python -m ruff check services/api     # lint Python code
uvicorn app.main:app --reload         # run FastAPI dev server (from services/api/)
```

**Environment variables for the API** (`services/api/.env` or shell):
- `OPENAI_API_KEY` — required; no default
- `OPENAI_REALTIME_MODEL` — default `gpt-realtime`
- `OPENAI_REALTIME_VOICE` — default `alloy`
- `MAX_INTERVIEW_SECONDS` — default `600`
- `OPENAI_REALTIME_INSTRUCTIONS` — overrides the built-in system prompt

**Extension API base URL** is read from `PLASMO_PUBLIC_API_HOST` at build time (defaults to `http://localhost:8000`).

## Architecture

### High-level flow
1. The Chrome extension content script (`apps/extension/src/contents/leetcode.tsx`) mounts a shadow-DOM host on every `leetcode.com/problems/*` page, then renders `InterviewOverlay` inside it.
2. `InterviewOverlay` scrapes the current problem from the DOM (`leetcode-page.ts`) and manages the full session lifecycle.
3. When the user starts a session, the extension POSTs the problem payload to the FastAPI backend (`POST /v1/realtime/sessions`). The backend mints a short-lived OpenAI Realtime client secret via `RealtimeClientSecretBroker` and returns it.
4. The extension creates a WebRTC peer connection (`RealtimeSession`) using that client secret, enabling bidirectional voice with the OpenAI Realtime API.
5. A service-worker background script (`background/index.ts`) stores the latest code snapshot so it can be forwarded to the Realtime model in future tool-call flows.

### Extension source map (`apps/extension/src/`)
| File | Role |
|---|---|
| `InterviewOverlay.tsx` | Root React component; owns all state and side-effects |
| `state.ts` | Pure state machine (no React). All `InterviewShellState` transitions live here. |
| `overlay-ui.tsx` | Presentational components: `CollapsedToolbar`, `ExpandedPanel` |
| `realtime-session.ts` | `RealtimeSession` class (WebRTC) + `fetchClientSecret` |
| `leetcode-page.ts` | DOM scraping: title, difficulty, description, examples, constraints |
| `code-snapshot.ts` | Shared message-type constants for the snapshot protocol |
| `code-snapshot-runtime.ts` | Page-side reader that the content script installs |
| `background/index.ts` | SW that relays snapshot messages and caches the latest snapshot |
| `contents/leetcode.tsx` | Plasmo content-script entry point; creates shadow DOM, exports `InterviewOverlay` |
| `toolbar-anchor.ts` | Resolves where to position the floating button relative to LeetCode's toolbar |
| `overlay-bootstrap.ts` | Staggered sync delays for initial visibility check |
| `overlay-visibility.ts` | Logic for whether to show the overlay (path-based URL check) |
| `popover-placement.ts` | Computes panel placement from button rect + viewport |
| `debug-controls.ts` | Feature flag for the code-capture debug action |

### API source map (`services/api/app/`)
| File | Role |
|---|---|
| `main.py` | FastAPI app factory; single endpoint `POST /v1/realtime/sessions` |
| `core/realtime.py` | `RealtimeClientSecretBroker` — calls OpenAI `/v1/realtime/client_secrets` |
| `core/settings.py` | `get_settings()` — reads env vars; contains the default system prompt |
| `core/prompt_compiler.py` | `compile_realtime_instructions()` — interpolates problem context into the system prompt |
| `models/realtime.py` | Pydantic request/response models |

### Shared package (`packages/shared/src/`)
Exports TypeScript types and constants shared between workspace packages. Referenced as `@loop/shared`.

## Coding conventions

**TypeScript**: 2-space indent, double quotes, `camelCase` for functions/variables, `PascalCase` for components and classes. Test files: `*.test.ts`; Playwright specs: `*.spec.ts`. Unit tests live alongside source in `apps/extension/src/`; browser-level tests go in `apps/extension/tests/`.

**Python**: 4-space indent, Ruff defaults (`pyproject.toml`), 100-character line limit. `snake_case` for functions/modules; FastAPI models must be explicit and typed.

**State management**: `state.ts` is kept free of React and side-effects — all transitions are pure functions that take the current `InterviewShellState` and return the next one. `InterviewOverlay` calls these and passes the result to `setState`.

**Commits**: Conventional Commits style — `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.
