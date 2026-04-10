# loop

Monorepo for the LeetCode Voice Interviewer PoC.

## Structure

- `apps/extension`: Chrome extension overlay injected into LeetCode problem pages
- `services/api`: FastAPI backend that brokers short-lived OpenAI Realtime sessions
- `packages/shared`: Shared TypeScript types and constants
- `docs/architecture`: Architecture notes and interface contracts
- `scripts`: Repo-level helper scripts

## Planned Stack

- Frontend: Plasmo, React, TypeScript
- Backend: FastAPI
- Voice: OpenAI Realtime API
- Repo tooling: pnpm workspaces

## Development

This repository currently contains baseline scaffolding only. Application dependencies and implementation details will be added in follow-up work.
