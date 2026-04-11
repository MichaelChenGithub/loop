# Local Development Handbook

## Run the Backend
Open a terminal in the repo root and create a virtual environment:

```bash
cd /Users/michael/Projects/loop
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/api/requirements.txt
```

Set the required API key, move into `services/api`, and start the FastAPI service:

```bash
export OPENAI_API_KEY=your_openai_api_key
cd services/api
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Optional backend overrides:

```bash
export OPENAI_REALTIME_MODEL=gpt-realtime-mini
export OPENAI_REALTIME_VOICE=alloy
export MAX_INTERVIEW_SECONDS=2400
```

Verify the service:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Run the Frontend
Open a second terminal in the repo root and install workspace dependencies:

```bash
cd /Users/michael/Projects/loop
corepack pnpm install
```

Start the extension dev server:

```bash
corepack pnpm dev:extension
```

The extension defaults to `http://localhost:8000` for the backend, which matches the backend command above.

## Useful Commands
Type-check the TypeScript workspace:

```bash
corepack pnpm typecheck
```

Run extension unit tests:

```bash
corepack pnpm --dir apps/extension test
```

Run backend tests:

```bash
source .venv/bin/activate
python -m pytest services/api/tests
```
