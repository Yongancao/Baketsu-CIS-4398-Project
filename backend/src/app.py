import os
from fastapi import FastAPI
from .routes import auth, files
from .db import init_db


def create_app() -> FastAPI:
    app = FastAPI(title="Baketsu Backend")
    app.include_router(auth.router, prefix="/api/auth")
    app.include_router(files.router, prefix="/api/files")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    # ensure DB/tables
    try:
        init_db()
    except Exception:
        pass

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("src.app:app", host="0.0.0.0", port=port, reload=True)
