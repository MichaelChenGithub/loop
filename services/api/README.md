# API

FastAPI service for the LeetCode Voice Interviewer PoC.

## Responsibilities

- Hold the long-lived OpenAI API key
- Create short-lived session credentials for browser clients
- Expose a minimal control-plane API for extension bootstrapping

## Endpoints

- `GET /health`
- `POST /v1/realtime/sessions`

## Session Broker

The realtime session broker uses the server-held `OPENAI_API_KEY` to create a fresh OpenAI Realtime client secret for each request. The response returned to the browser is limited to the ephemeral client secret and a small session summary.

Server-owned defaults are configured through:

- `OPENAI_REALTIME_MODEL`
- `OPENAI_REALTIME_VOICE`
- `OPENAI_REALTIME_INSTRUCTIONS`
