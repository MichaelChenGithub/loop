from fastapi import FastAPI


app = FastAPI(title="loop api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
