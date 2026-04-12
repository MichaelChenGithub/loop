# Repository Guidelines

## Project Structure & Module Organization
`loop` is a small monorepo managed with `pnpm-workspace.yaml`.

- `apps/extension`: Plasmo-based Chrome extension, with source in `src/`, smoke tests in `tests/`, and icons in `assets/`.
- `services/api`: FastAPI backend, with app code under `app/` and pytest coverage under `tests/`.
- `packages/shared`: shared TypeScript types/constants consumed by workspace packages.
- `docs/architecture`: contracts and design notes.
- `scripts`: repo-level helpers and operational notes.

Keep new code close to its runtime. For example, add extension UI logic under `apps/extension/src/` and backend request models under `services/api/app/models/`. Auth logic belongs in `services/api/app/core/auth.py`; quota enforcement in `services/api/app/api/quota.py`.

## Build, Test, and Development Commands
- `corepack pnpm install`: install workspace dependencies.
- `corepack pnpm dev:extension`: run the extension locally through Plasmo.
- `corepack pnpm build:extension`: produce the extension build artifact.
- `corepack pnpm typecheck`: run TypeScript checks for shared code and the extension.
- `corepack pnpm --dir apps/extension test`: run extension unit tests with Vitest.
- `corepack pnpm --dir apps/extension smoke`: run Playwright smoke coverage.
- `python -m pytest services/api/tests`: run API tests.
- `python -m ruff check services/api`: lint Python code.

## Coding Style & Naming Conventions
TypeScript uses 2-space indentation, double quotes, `camelCase` for functions/variables, and `PascalCase` for React components and classes such as `InterviewOverlay` and `RealtimeSession`. Test files follow `*.test.ts`; Playwright specs use `*.spec.ts`.

Python uses 4-space indentation and Ruff defaults from `pyproject.toml` with a 100-character line limit. Prefer `snake_case` for functions/modules and keep FastAPI models explicit and typed.

## Testing Guidelines
Add unit tests alongside extension source in `apps/extension/src/` when behavior is module-local. Put browser-level scenarios in `apps/extension/tests/`. Backend tests belong in `services/api/tests/` and should cover request validation, broker failures, response sanitization, auth token verification, and quota enforcement.

Run the relevant test target before opening a PR. No formal coverage gate is configured, so match the surrounding test depth for any changed behavior.

## Commit & Pull Request Guidelines
Recent history follows concise Conventional Commit-style subjects such as `feat: add leetcode code snapshot foundation`. Use the same pattern: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.

PRs should include a short summary, linked issue when applicable, and screenshots or recordings for extension UI changes. Call out any API contract changes (including auth or quota behaviour) and list the verification commands you ran.
